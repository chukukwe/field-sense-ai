import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import { z } from 'zod';
import { assessmentSchema, cropTypes, type CropAssessmentResult } from './assessmentSchema.js';

const scanIdSchema = z.string().regex(/^scan-[a-zA-Z0-9-]{1,80}$/);
const cropSchema = z.enum(cropTypes);
const observationsSchema = z.string().max(1000).optional().default('');

export interface AnalyzeDependencies {
  verifyIdToken: (token: string) => Promise<{ uid: string }>;
  claimScan: (uid: string, scanId: string, cropType: string) => Promise<'claimed' | 'processing' | 'complete' | 'missing'>;
  saveAssessment: (uid: string, scanId: string, assessment: CropAssessmentResult) => Promise<void>;
  failScan: (uid: string, scanId: string) => Promise<void>;
  assessImage: (image: Buffer, mimeType: string, cropType: string, observations: string) => Promise<unknown>;
  allowedOrigins: string[];
  limiterMax?: number;
  maxImageBytes?: number;
  photoStore?: PhotoStoreDependencies;
}

export interface PhotoRecord {
  cloudPhotoPath?: string;
}

export interface PhotoStoreDependencies {
  getPhotoRecord: (uid: string, scanId: string) => Promise<PhotoRecord | null>;
  savePhotoReference: (uid: string, scanId: string, path: string) => Promise<void>;
  clearPhotoReference: (uid: string, scanId: string) => Promise<void>;
  upload: (path: string, image: Buffer, contentType: string) => Promise<void>;
  download: (path: string) => Promise<{ bytes: Buffer; contentType: string } | null>;
  remove: (path: string) => Promise<void>;
}

export class ProviderError extends Error {
  constructor(
    public readonly code: string,
    public readonly status = 502,
    public readonly publicMessage = 'The crop assessment service could not complete this request.',
  ) {
    super(code);
  }
}

function sendError(res: express.Response, status: number, code: string, message: string, retryable = false) {
  return res.status(status).json({ error: { code, message, retryable } });
}

export function createApp(deps: AnalyzeDependencies) {
  const app = express();
  const maxImageBytes = deps.maxImageBytes ?? 8 * 1024 * 1024;
  const maxImageMb = Math.floor(maxImageBytes / (1024 * 1024));
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxImageBytes, files: 1, fields: 3, parts: 4 },
  });
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || deps.allowedOrigins.includes(origin)) callback(null, true);
      else callback(new Error('Origin is not allowed.'));
    },
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  }));
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  const photoStore = deps.photoStore;
  if (photoStore) {
    const photoLimiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });
    app.use('/api/scans/:scanId/photo', photoLimiter);

    app.post('/api/scans/:scanId/photo', (req, res) => {
      void (async () => {
        const uid = await authenticatedUid(req, deps);
        if (!uid) return sendError(res, 401, 'AUTH_REQUIRED', 'Sign in again before saving a crop photo.');
        const scanIdResult = scanIdSchema.safeParse(req.params.scanId);
        if (!scanIdResult.success) return sendError(res, 400, 'INVALID_SCAN_ID', 'A valid scan ID is required.');
        upload.single('image')(req, res, (uploadError?: unknown) => {
          void (async () => {
            if (uploadError instanceof multer.MulterError) {
              const tooLarge = uploadError.code === 'LIMIT_FILE_SIZE';
              return sendError(res, tooLarge ? 413 : 400, tooLarge ? 'IMAGE_TOO_LARGE' : 'INVALID_UPLOAD', tooLarge ? `Choose an image smaller than ${maxImageMb} MB.` : 'Upload one image file only.', true);
            }
            if (uploadError) return sendError(res, 400, 'INVALID_UPLOAD', 'The image upload could not be read.', true);
            const file = req.file;
            if (!file?.buffer?.length) return sendError(res, 400, 'IMAGE_REQUIRED', 'Select a crop photo before uploading it.');
            const verified = await fileTypeFromBuffer(file.buffer).catch(() => undefined);
            const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
            if (!verified || !extensions[verified.mime] || verified.mime !== file.mimetype) return sendError(res, 415, 'UNSUPPORTED_IMAGE', 'Use a valid JPEG, PNG, or WebP image.');
            try {
              const metadata = await sharp(file.buffer, { limitInputPixels: 20_000_000 }).metadata();
              if (!metadata.width || !metadata.height) throw new Error('invalid dimensions');
              await sharp(file.buffer, { limitInputPixels: 20_000_000 }).stats();
            } catch { return sendError(res, 415, 'MALFORMED_IMAGE', 'The image file is damaged or cannot be decoded. Choose another photo.'); }

            const scanId = scanIdResult.data;
            let priorRecord: PhotoRecord | null;
            try { priorRecord = await photoStore.getPhotoRecord(uid, scanId); }
            catch { return sendError(res, 503, 'SCAN_UNAVAILABLE', 'The saved scan could not be verified. Check your connection and retry.', true); }
            if (!priorRecord) return sendError(res, 404, 'SCAN_NOT_FOUND', 'This scan is not available in your account.');
            const path = priorRecord.cloudPhotoPath ?? `users/${uid}/scans/${scanId}/photo`;
            if (!isOwnedPhotoPath(path, uid, scanId)) return sendError(res, 403, 'PHOTO_PATH_INVALID', 'This photo reference is not available to your account.');
            try {
              await photoStore.upload(path, file.buffer, verified.mime);
              await photoStore.savePhotoReference(uid, scanId, path);
              return res.status(200).json({ cloudPhotoPath: path });
            } catch {
              // If this was a first upload, remove any object left behind by a failed Firestore update.
              if (!priorRecord.cloudPhotoPath) await photoStore.remove(path).catch(() => undefined);
              return sendError(res, 503, 'PHOTO_SAVE_FAILED', 'The photo could not be saved to your account. Your local copy is still available; retry the upload.', true);
            } finally { req.file = undefined; }
          })().catch(() => sendError(res, 500, 'INTERNAL_ERROR', 'The photo upload could not be completed.'));
        });
      })().catch(() => sendError(res, 401, 'AUTH_INVALID', 'Your sign-in has expired. Sign in again to continue.'));
    });

    app.get('/api/scans/:scanId/photo', (req, res) => {
      void (async () => {
        const uid = await authenticatedUid(req, deps);
        if (!uid) return sendError(res, 401, 'AUTH_REQUIRED', 'Sign in again to view this crop photo.');
        const scanIdResult = scanIdSchema.safeParse(req.params.scanId);
        if (!scanIdResult.success) return sendError(res, 400, 'INVALID_SCAN_ID', 'A valid scan ID is required.');
        const scanId = scanIdResult.data;
        const record = await photoStore.getPhotoRecord(uid, scanId);
        if (!record?.cloudPhotoPath || !isOwnedPhotoPath(record.cloudPhotoPath, uid, scanId)) return sendError(res, 404, 'PHOTO_NOT_FOUND', 'This scan does not have a saved cloud photo.');
        const downloaded = await photoStore.download(record.cloudPhotoPath);
        if (!downloaded) return sendError(res, 404, 'PHOTO_NOT_FOUND', 'This crop photo is unavailable. You can retry its upload from this device.');
        res.setHeader('Content-Type', downloaded.contentType);
        res.setHeader('Cache-Control', 'private, no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return res.status(200).send(downloaded.bytes);
      })().catch(() => sendError(res, 503, 'PHOTO_READ_FAILED', 'The crop photo could not be loaded. Check your connection and retry.', true));
    });

    app.delete('/api/scans/:scanId/photo', (req, res) => {
      void (async () => {
        const uid = await authenticatedUid(req, deps);
        if (!uid) return sendError(res, 401, 'AUTH_REQUIRED', 'Sign in again before deleting this crop photo.');
        const scanIdResult = scanIdSchema.safeParse(req.params.scanId);
        if (!scanIdResult.success) return sendError(res, 400, 'INVALID_SCAN_ID', 'A valid scan ID is required.');
        const scanId = scanIdResult.data;
        const record = await photoStore.getPhotoRecord(uid, scanId);
        if (!record) return sendError(res, 404, 'SCAN_NOT_FOUND', 'This scan is not available in your account.');
        if (!record.cloudPhotoPath) return res.status(200).json({ deleted: false });
        if (!isOwnedPhotoPath(record.cloudPhotoPath, uid, scanId)) return sendError(res, 403, 'PHOTO_PATH_INVALID', 'This photo reference is not available to your account.');
        try {
          await photoStore.remove(record.cloudPhotoPath);
          await photoStore.clearPhotoReference(uid, scanId);
          return res.status(200).json({ deleted: true });
        } catch { return sendError(res, 503, 'PHOTO_DELETE_FAILED', 'The cloud photo could not be deleted. The scan record was kept; retry deletion.', true); }
      })().catch(() => sendError(res, 503, 'PHOTO_DELETE_FAILED', 'The cloud photo could not be deleted. The scan record was kept; retry deletion.', true));
    });
  } else {
    app.all('/api/scans/:scanId/photo', (_req, res) => sendError(res, 503, 'PHOTO_STORAGE_NOT_CONFIGURED', 'Private photo storage is not configured yet. Your photo remains on this device; contact the app administrator to finish setup.', true));
  }
  app.use('/api/analyze-crop', rateLimit({
    windowMs: 60_000,
    limit: deps.limiterMax ?? 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many analysis requests. Please wait before trying again.', retryable: true } },
  }));

  app.post('/api/analyze-crop', (req, res) => {
    const tokenMatch = /^Bearer\s+(\S+)$/i.exec(req.header('authorization') ?? '');
    if (!tokenMatch) return sendError(res, 401, 'AUTH_REQUIRED', 'Sign in again before requesting an assessment.');

    void deps.verifyIdToken(tokenMatch[1]!).then(({ uid }) => {
      upload.single('image')(req, res, (uploadError?: unknown) => {
        void (async () => {
          if (uploadError instanceof multer.MulterError) {
            const tooLarge = uploadError.code === 'LIMIT_FILE_SIZE';
            return sendError(res, tooLarge ? 413 : 400, tooLarge ? 'IMAGE_TOO_LARGE' : 'INVALID_UPLOAD', tooLarge ? `Choose an image smaller than ${maxImageMb} MB.` : 'Upload one image file only.');
          }
          if (uploadError) return sendError(res, 400, 'INVALID_UPLOAD', 'The image upload could not be read.');

          const scanIdResult = scanIdSchema.safeParse(req.body.scanId);
          if (!scanIdResult.success) return sendError(res, 400, 'INVALID_SCAN_ID', 'A valid scan ID is required.');
          const cropResult = cropSchema.safeParse(req.body.cropType);
          if (!cropResult.success) return sendError(res, 400, 'INVALID_CROP', 'Choose one of the supported crop types.');
          const observationsResult = observationsSchema.safeParse(req.body.observations);
          if (!observationsResult.success) return sendError(res, 400, 'INVALID_OBSERVATIONS', 'Your note must be 1,000 characters or fewer.');
          if (!req.file?.buffer?.length) return sendError(res, 400, 'IMAGE_REQUIRED', 'Select a crop photo before requesting an assessment.');

          const file = req.file;
          const verifiedFile = await fileTypeFromBuffer(file.buffer).catch(() => undefined);
          const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
          if (!verifiedFile || !allowedMimeTypes.has(verifiedFile.mime) || verifiedFile.mime !== file.mimetype) {
            return sendError(res, 415, 'UNSUPPORTED_IMAGE', 'Use a valid JPEG, PNG, or WebP image.');
          }
          try {
            const metadata = await sharp(file.buffer, { limitInputPixels: 20_000_000 }).metadata();
            if (!metadata.width || !metadata.height) throw new Error('Missing image dimensions.');
            await sharp(file.buffer, { limitInputPixels: 20_000_000 }).stats();
          } catch {
            return sendError(res, 415, 'MALFORMED_IMAGE', 'The image file is damaged or cannot be decoded. Choose another photo.');
          }

          const scanId = scanIdResult.data;
          const cropType = cropResult.data;
          try {
            const claim = await deps.claimScan(uid, scanId, cropType);
            if (claim === 'missing') return sendError(res, 404, 'SCAN_NOT_FOUND', 'This scan is not available in your account.');
            if (claim === 'complete') return sendError(res, 409, 'ALREADY_ASSESSED', 'This scan already has an assessment.');
            if (claim === 'processing') return sendError(res, 409, 'ALREADY_PROCESSING', 'This scan is already being assessed.');
            try {
              const raw = await deps.assessImage(file.buffer, verifiedFile.mime, cropType, observationsResult.data);
              const parsed = assessmentSchema.safeParse(raw);
              if (!parsed.success) throw new ProviderError('INVALID_MODEL_RESPONSE', 502, 'The assessment could not be validated. You can retry this scan.');
              await deps.saveAssessment(uid, scanId, parsed.data);
              return res.status(200).json({ assessment: parsed.data });
            } catch (error) {
              await deps.failScan(uid, scanId).catch(() => undefined);
              if (error instanceof ProviderError) return sendError(res, error.status, error.code, error.publicMessage, true);
              return sendError(res, 502, 'ASSESSMENT_FAILED', 'The crop assessment service could not complete this request.', true);
            }
          } catch {
            return sendError(res, 503, 'SCAN_UNAVAILABLE', 'The saved scan could not be verified. Check your connection and try again.', true);
          } finally {
            req.file = undefined;
          }
        })().catch(() => sendError(res, 500, 'INTERNAL_ERROR', 'The request could not be completed.'));
      });
    }).catch(() => sendError(res, 401, 'AUTH_INVALID', 'Your sign-in has expired. Sign in again to continue.'));
  });

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (res.headersSent) return;
    if (error instanceof Error && error.message === 'Origin is not allowed.') {
      sendError(res, 403, 'ORIGIN_NOT_ALLOWED', 'This application origin is not allowed.');
      return;
    }
    sendError(res, 500, 'INTERNAL_ERROR', 'The request could not be completed.');
  });
  return app;
}

async function authenticatedUid(req: express.Request, deps: AnalyzeDependencies): Promise<string | null> {
  const tokenMatch = /^Bearer\s+(\S+)$/i.exec(req.header('authorization') ?? '');
  if (!tokenMatch) return null;
  try { return (await deps.verifyIdToken(tokenMatch[1]!)).uid; } catch { return null; }
}

function isOwnedPhotoPath(path: string, uid: string, scanId: string): boolean {
  return path === `users/${uid}/scans/${scanId}/photo`;
}
