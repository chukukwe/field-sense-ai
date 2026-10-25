import cors from 'cors';
import { randomUUID } from 'node:crypto';
import express from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import helmet from 'helmet';
import multer from 'multer';
import { isIP } from 'node:net';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import { z } from 'zod';
import { assessmentSchema, cropTypes, type CropAssessmentResult } from './assessmentSchema.js';
import { PhotoStorageError } from './photoStorageError.js';

const scanIdSchema = z.string().regex(/^scan-[a-zA-Z0-9-]{1,80}$/);
const cropSchema = z.enum(cropTypes);
const observationsSchema = z.string().max(1000).optional().default('');
const customCropNameSchema = z.string().trim().min(1).max(80).refine((value) => !/[<>]/.test(value) && ![...value].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)).optional();

// Render sets these process environment variables; callers cannot select them
// with request headers. Trust CF-Connecting-IP only on Render public web services.
export function shouldTrustRenderEdgeClientIp(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.RENDER === 'true' && env.RENDER_SERVICE_TYPE === 'web';
}

// Never use X-Forwarded-For: callers can supply a spoofed value. Validate the
// trusted edge header and otherwise fall back to the direct socket address.
export function resolveRateLimitClientKey(
  edgeHeader: string | undefined,
  socketAddress: string | undefined,
  trustRenderEdgeHeader: boolean,
): string {
  const edgeAddress = trustRenderEdgeHeader ? edgeHeader?.trim() : undefined;
  const candidate = edgeAddress && isIP(edgeAddress) ? edgeAddress : socketAddress?.trim() ?? '';
  return isIP(candidate) ? ipKeyGenerator(candidate) : 'unknown-client';
}

export interface AnalyzeDependencies {
  verifyIdToken: (token: string) => Promise<{ uid: string }>;
  claimScan: (
    uid: string,
    scanId: string,
    cropType: string,
    details: { customCropName?: string; observations: string },
  ) => Promise<'claimed' | 'processing' | 'complete' | 'missing'>;
  saveAssessment: (uid: string, scanId: string, assessment: CropAssessmentResult) => Promise<void>;
  getAssessment?: (uid: string, scanId: string) => Promise<unknown>;
  failScan: (uid: string, scanId: string, publicMessage: string) => Promise<void>;
  assessImage: (image: Buffer, mimeType: string, cropType: string, observations: string, requestId: string) => Promise<unknown>;
  translateAssessment?: (assessment: CropAssessmentResult) => Promise<unknown>;
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
  upload: (path: string, image: Buffer, contentType: string, options: { upsert: boolean }) => Promise<{ created: boolean }>;
  download: (path: string) => Promise<{ bytes: Buffer; contentType: string } | null>;
  remove: (path: string) => Promise<void>;
}

export class ProviderError extends Error {
  constructor(
    public readonly code: string,
    public readonly status = 502,
    public readonly publicMessage = 'The crop assessment service could not complete this request.',
    public readonly retryable = true,
  ) {
    super(code);
  }
}

const MAX_ASSESSMENT_IMAGE_EDGE = 2048;

async function prepareAssessmentImage(image: Buffer, mimeType: string) {
  const startedAt = performance.now();
  const metadata = await sharp(image, { limitInputPixels: 20_000_000 }).metadata();
  if (!metadata.width || !metadata.height) throw new Error('Image dimensions are unavailable.');
  if (metadata.width <= MAX_ASSESSMENT_IMAGE_EDGE && metadata.height <= MAX_ASSESSMENT_IMAGE_EDGE) {
    await sharp(image, { limitInputPixels: 20_000_000 }).stats();
    return {
      buffer: image,
      mimeType,
      width: metadata.width,
      height: metadata.height,
      processingMs: Math.max(0, Math.round(performance.now() - startedAt)),
    };
  }
  const result = await sharp(image, { limitInputPixels: 20_000_000 })
    .rotate()
    .resize({
      width: MAX_ASSESSMENT_IMAGE_EDGE,
      height: MAX_ASSESSMENT_IMAGE_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 88 })
    .toBuffer({ resolveWithObject: true });
  if (!result.info.width || !result.info.height) throw new Error('Image dimensions are unavailable.');
  return {
    buffer: result.data,
    mimeType: 'image/jpeg',
    width: result.info.width,
    height: result.info.height,
    processingMs: Math.max(0, Math.round(performance.now() - startedAt)),
  };
}

function sendError(res: express.Response, status: number, code: string, message: string, retryable = false) {
  return res.status(status).json({ error: { code, message, retryable } });
}

// These failures concern the server's ability to verify an account, rather
// than the validity of the farmer's token. Never log raw SDK messages or tokens.
const AUTH_SERVICE_ERROR_CODES = new Set([
  'auth/insufficient-permission', 'auth/invalid-credential', 'auth/internal-error',
  'auth/project-not-found', 'auth/quota-exceeded', 'auth/operation-not-allowed',
  'app/invalid-credential', 'app/invalid-app-options', 'app/no-app', 'app/internal-error',
  'app/network-error', 'app/network-timeout', 'app/unable-to-parse-response',
  'ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ECONNRESET', 'ENETUNREACH',
  'EHOSTUNREACH', 'ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT',
]);

function sendAuthenticationError(res: express.Response, error: unknown) {
  let current: unknown = error;
  for (let depth = 0; depth < 6 && typeof current === 'object' && current !== null; depth += 1) {
    const item = current as { code?: unknown; cause?: unknown };
    if (typeof item.code === 'string' && AUTH_SERVICE_ERROR_CODES.has(item.code)) {
      console.warn(JSON.stringify({ event: 'firebase_auth_unavailable', code: item.code }));
      return sendError(res, 503, 'AUTH_SERVICE_UNAVAILABLE',
        'We could not check your sign-in right now. Please try again later. If this continues, contact support.', true);
    }
    current = item.cause;
  }
  return sendError(res, 401, 'AUTH_INVALID', 'Your sign-in has expired or is invalid. Sign in again to continue.');
}

function logAssessmentEvent(
  level: 'info' | 'warn',
  event: string,
  requestId: string,
  details: Record<string, string | number | boolean | undefined> = {},
) {
  console[level](JSON.stringify({ event, requestId, ...details }));
}

function safeFirestoreErrorCode(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('code' in error)) return 'other';
  const value = String((error as { code?: unknown }).code ?? '').toLocaleLowerCase('en');
  const known = ['aborted','already-exists','cancelled','deadline-exceeded','failed-precondition','internal','not-found',
    'permission-denied','resource-exhausted','unauthenticated','unavailable','unknown'];
  return known.find((code) => value === code || value.endsWith(`/${code}`)) ?? 'other';
}

function logFirestoreFailure(operation: string, error: unknown): void {
  console.warn(`Assessment Firestore operation failed; operation=${operation}; code=${safeFirestoreErrorCode(error)}.`);
}

function sendPhotoStorageError(res: express.Response, error: unknown, operation: 'upload' | 'download' | 'delete') {
  const category = error instanceof PhotoStorageError ? error.category : 'request_rejected';
  const httpStatus = error instanceof PhotoStorageError ? error.httpStatus : undefined;
  console.warn(`Private photo ${operation} failed; category=${category}; httpStatus=${httpStatus ?? 'none'}.`);
  const errors = {
    invalid_credentials: ['PHOTO_STORAGE_INVALID_CREDENTIALS', 'Private photo storage rejected its server credentials. Contact the app administrator.', false],
    authorization: ['PHOTO_STORAGE_FORBIDDEN', 'Private photo storage denied this action. Contact the app administrator.', false],
    invalid_endpoint: ['PHOTO_STORAGE_ENDPOINT_INVALID', 'Private photo storage has an invalid server endpoint configuration. Contact the app administrator.', false],
    endpoint_not_found: ['PHOTO_STORAGE_ENDPOINT_NOT_FOUND', 'The configured private photo storage API endpoint was not found. Contact the app administrator.', false],
    bucket_missing: ['PHOTO_STORAGE_BUCKET_NOT_FOUND', 'The configured private photo bucket was not found. Contact the app administrator.', false],
    object_missing: ['PHOTO_STORAGE_OBJECT_NOT_FOUND', 'The requested private photo object was not found.', false],
    not_found: ['PHOTO_STORAGE_NOT_FOUND', 'Private photo storage returned an unclassified not-found response. Contact the app administrator.', false],
    timeout: ['PHOTO_STORAGE_TIMEOUT', 'Photo storage took too long to respond. Your local copy is still available; retry later.', true],
    network: ['PHOTO_STORAGE_NETWORK_ERROR', 'Photo storage could not be reached. Your local copy is still available; retry later.', true],
    upstream: ['PHOTO_STORAGE_UNAVAILABLE', 'Private photo storage is temporarily unavailable. Your local copy is still available.', true],
    request_rejected: ['PHOTO_STORAGE_REQUEST_REJECTED', 'Private photo storage rejected this request. Your local copy is still available.', false],
  } as const;
  const [code, message, retryable] = errors[category];
  const status = category === 'object_missing' ? 404
    : category === 'upstream' || category === 'request_rejected' ? 502 : 503;
  return sendError(res, status, code, message, retryable);
}

export function createApp(deps: AnalyzeDependencies) {
  const app = express();
  const trustRenderEdgeHeader = shouldTrustRenderEdgeClientIp();
  const rateLimitClientKey = (req: express.Request) => resolveRateLimitClientKey(
    req.header('cf-connecting-ip'),
    req.socket?.remoteAddress,
    trustRenderEdgeHeader,
  );
  const maxImageBytes = deps.maxImageBytes ?? 8 * 1024 * 1024;
  const maxImageMb = Math.floor(maxImageBytes / (1024 * 1024));
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxImageBytes, files: 1, fields: 4, parts: 5 },
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
  const translationLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false, keyGenerator: rateLimitClientKey });
  app.post('/api/assessment/translate-pidgin', translationLimiter, (req, res) => {
    express.json({ limit: '32kb' })(req, res, (parseError?: unknown) => {
      void (async () => {
        if (parseError) return sendError(res, 400, 'TRANSLATION_REQUEST_INVALID', 'The assessment could not be read.');
        const tokenMatch = /^Bearer\s+(\S+)$/i.exec(req.header('authorization') ?? '');
        if (!tokenMatch) return sendError(res, 401, 'AUTH_REQUIRED', 'Sign in again to translate this result.');
        try { await deps.verifyIdToken(tokenMatch[1]!); }
        catch (error) { return sendAuthenticationError(res, error); }
        if (!deps.translateAssessment) return sendError(res, 503, 'TRANSLATION_NOT_CONFIGURED', 'Pidgin translation is not available right now. Your English result is still available.', true);
        const parsed = assessmentSchema.safeParse((req.body as {assessment?: unknown} | undefined)?.assessment);
        if (!parsed.success) return sendError(res, 400, 'ASSESSMENT_INVALID', 'The saved assessment could not be checked.');
        try {
          const result = assessmentSchema.safeParse(await deps.translateAssessment(parsed.data));
          if (!result.success) return sendError(res, 502, 'INVALID_TRANSLATION', 'Pidgin translation could not be checked. Your English result is still available.', true);
          return res.json({ assessment: result.data });
        } catch (error) {
          if (error instanceof ProviderError) return sendError(res, error.status, error.code, error.publicMessage, error.retryable);
          return sendError(res, 502, 'TRANSLATION_UNAVAILABLE', 'Pidgin translation could not be loaded. Your English result is still available.', true);
        }
      })().catch(() => sendError(res, 500, 'INTERNAL_ERROR', 'The request could not be completed.'));
    });
  });
  const readSavedAssessment = async (uid: string, scanId: string): Promise<CropAssessmentResult | undefined> => {
    if (!deps.getAssessment) return undefined;
    try {
      const saved = assessmentSchema.safeParse(await deps.getAssessment(uid, scanId));
      return saved.success ? saved.data : undefined;
    } catch (error) {
      logFirestoreFailure('read_assessment', error);
      return undefined;
    }
  };
  const photoStore = deps.photoStore;
  if (photoStore) {
    const photoLimiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false, keyGenerator: rateLimitClientKey });
    app.use('/api/scans/:scanId/photo', photoLimiter);

    app.post('/api/scans/:scanId/photo', (req, res) => {
      void (async () => {
        const uid = await authenticatedUid(req, res, deps, 'Sign in again before saving a crop photo.');
        if (!uid) return;
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
            let uploadResult: { created: boolean };
            try {
              uploadResult = await photoStore.upload(path, file.buffer, verified.mime, {
                upsert: Boolean(priorRecord.cloudPhotoPath),
              });
            } catch (error) {
              // A prior create may have succeeded while its Firestore link could
              // not be confirmed. Recover only the identical owner-scoped bytes;
              // never overwrite an unlinked object with a different photo.
              let samePhoto = false;
              if (!priorRecord.cloudPhotoPath && error instanceof PhotoStorageError
                && error.category === 'request_rejected' && [400, 409].includes(error.httpStatus ?? 0)) {
                try {
                  const existing = await photoStore.download(path);
                  samePhoto = Boolean(existing && existing.bytes.equals(file.buffer)
                    && existing.contentType.split(';')[0]?.trim().toLowerCase() === verified.mime);
                } catch { /* retain the original safe upload failure */ }
              }
              if (!samePhoto) return sendPhotoStorageError(res, error, 'upload');
              uploadResult = { created: false };
            }
            try {
              await photoStore.savePhotoReference(uid, scanId, path);
              return res.status(200).json({ cloudPhotoPath: path });
            } catch {
              let currentRecord: PhotoRecord | null | undefined;
              try { currentRecord = await photoStore.getPhotoRecord(uid, scanId); }
              catch {
                console.warn('Private photo reference status is unknown; category=firestore_read; rollback=skipped.');
              }
              if (currentRecord?.cloudPhotoPath === path) return res.status(200).json({ cloudPhotoPath: path });
              if (uploadResult.created && currentRecord !== undefined && !currentRecord?.cloudPhotoPath) {
                await photoStore.remove(path).catch(() => {
                  console.warn('Private photo cleanup failed; category=storage_delete.');
                });
              } else if (uploadResult.created) {
                console.warn('Private photo rollback skipped; category=photo_ownership_unconfirmed.');
              }
              console.warn('Private photo reference could not be saved; category=firestore_update.');
              return sendError(res, 503, 'PHOTO_REFERENCE_SAVE_FAILED', 'The photo could not be linked to the scan. Your local copy is still available; retry the upload.', true);
            } finally { req.file = undefined; }
          })().catch(() => sendError(res, 500, 'INTERNAL_ERROR', 'The photo upload could not be completed.'));
        });
      })().catch(() => sendError(res, 500, 'INTERNAL_ERROR', 'The photo upload could not be completed.'));
    });

    app.get('/api/scans/:scanId/photo', (req, res) => {
      void (async () => {
        const uid = await authenticatedUid(req, res, deps, 'Sign in again to view this crop photo.');
        if (!uid) return;
        const scanIdResult = scanIdSchema.safeParse(req.params.scanId);
        if (!scanIdResult.success) return sendError(res, 400, 'INVALID_SCAN_ID', 'A valid scan ID is required.');
        const scanId = scanIdResult.data;
        let record: PhotoRecord | null;
        try { record = await photoStore.getPhotoRecord(uid, scanId); }
        catch {
          console.warn('Private photo reference lookup failed; category=firestore_read.');
          return sendError(res, 503, 'SCAN_UNAVAILABLE', 'The scan could not be checked. Check your connection and retry.', true);
        }
        if (!record?.cloudPhotoPath || !isOwnedPhotoPath(record.cloudPhotoPath, uid, scanId)) return sendError(res, 404, 'PHOTO_NOT_FOUND', 'This scan does not have a saved cloud photo.');
        let downloaded: { bytes: Buffer; contentType: string } | null;
        try { downloaded = await photoStore.download(record.cloudPhotoPath); }
        catch (error) { return sendPhotoStorageError(res, error, 'download'); }
        if (!downloaded) return sendError(res, 404, 'PHOTO_NOT_FOUND', 'This crop photo is unavailable. You can retry its upload from this device.');
        res.setHeader('Content-Type', downloaded.contentType);
        res.setHeader('Cache-Control', 'private, no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return res.status(200).send(downloaded.bytes);
      })().catch(() => sendError(res, 503, 'PHOTO_READ_FAILED', 'The crop photo could not be loaded. Check your connection and retry.', true));
    });

    app.delete('/api/scans/:scanId/photo', (req, res) => {
      void (async () => {
        const uid = await authenticatedUid(req, res, deps, 'Sign in again before deleting this crop photo.');
        if (!uid) return;
        const scanIdResult = scanIdSchema.safeParse(req.params.scanId);
        if (!scanIdResult.success) return sendError(res, 400, 'INVALID_SCAN_ID', 'A valid scan ID is required.');
        const scanId = scanIdResult.data;
        const record = await photoStore.getPhotoRecord(uid, scanId);
        if (!record) return sendError(res, 404, 'SCAN_NOT_FOUND', 'This scan is not available in your account.');
        if (!record.cloudPhotoPath) return res.status(200).json({ deleted: false });
        if (!isOwnedPhotoPath(record.cloudPhotoPath, uid, scanId)) return sendError(res, 403, 'PHOTO_PATH_INVALID', 'This photo reference is not available to your account.');
        try { await photoStore.remove(record.cloudPhotoPath); }
        catch (error) { return sendPhotoStorageError(res, error, 'delete'); }
        try {
          await photoStore.clearPhotoReference(uid, scanId);
          return res.status(200).json({ deleted: true });
        } catch {
          console.warn('Deleted photo reference could not be cleared; category=firestore_update.');
          return sendError(res, 503, 'PHOTO_REFERENCE_SAVE_FAILED', 'The photo was deleted but the scan record could not be updated. Retry to finish cleanup.', true);
        }
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
    keyGenerator: rateLimitClientKey,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many analysis requests. Please wait before trying again.', retryable: true } },
  }));

  app.post('/api/analyze-crop', (req, res) => {
    const requestId = randomUUID();
    const requestStartedAt = performance.now();
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
          const customCropResult = customCropNameSchema.safeParse(req.body.customCropName);
          if (!customCropResult.success || (cropResult.data === 'Other' && !customCropResult.data)) return sendError(res, 400, 'INVALID_CUSTOM_CROP', 'Enter the name of your crop.');
          if (cropResult.data !== 'Other' && customCropResult.data) return sendError(res, 400, 'INVALID_CUSTOM_CROP', 'Remove the custom crop name or choose Others.');
          const observationsResult = observationsSchema.safeParse(req.body.observations);
          if (!observationsResult.success) return sendError(res, 400, 'INVALID_OBSERVATIONS', 'Your note must be 1,000 characters or fewer.');
          if (!req.file?.buffer?.length) return sendError(res, 400, 'IMAGE_REQUIRED', 'Select a crop photo before requesting an assessment.');

          const file = req.file;
          const verifiedFile = await fileTypeFromBuffer(file.buffer).catch(() => undefined);
          const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
          if (!verifiedFile || !allowedMimeTypes.has(verifiedFile.mime) || verifiedFile.mime !== file.mimetype) {
            return sendError(res, 415, 'UNSUPPORTED_IMAGE', 'Use a valid JPEG, PNG, or WebP image.');
          }
          let assessmentImage: Awaited<ReturnType<typeof prepareAssessmentImage>>;
          try {
            assessmentImage = await prepareAssessmentImage(file.buffer, verifiedFile.mime);
          } catch {
            return sendError(res, 415, 'MALFORMED_IMAGE', 'The image file is damaged or cannot be decoded. Choose another photo.');
          }

          const scanId = scanIdResult.data;
          const cropType = cropResult.data;
          try {
            let claim: Awaited<ReturnType<AnalyzeDependencies['claimScan']>>;
            try {
              claim = await deps.claimScan(uid, scanId, cropType, {
                ...(customCropResult.data ? { customCropName: customCropResult.data } : {}),
                observations: observationsResult.data,
              });
            } catch (error) {
              logFirestoreFailure('claim_transaction', error);
              return sendError(res, 503, 'SCAN_UNAVAILABLE', 'The scan could not be saved to your account. Check your connection and try again.', true);
            }
            if (claim === 'missing') return sendError(res, 404, 'SCAN_NOT_FOUND', 'This scan does not match a scan in your account.');
            if (claim === 'complete') {
              const saved = await readSavedAssessment(uid, scanId);
              if (saved) return res.status(200).json({ assessment: saved });
              return sendError(res, 409, 'ALREADY_ASSESSED', 'This scan already has an assessment.');
            }
            if (claim === 'processing') return sendError(res, 409, 'ALREADY_PROCESSING', 'This scan is already being assessed.');
            const providerStartedAt = performance.now();
            logAssessmentEvent('info', 'assessment_started', requestId, {
              requestPreparationMs: Math.max(0, Math.round(providerStartedAt - requestStartedAt)),
              imagePreparationMs: assessmentImage.processingMs,
            });
            let providerElapsedMs: number | undefined;
            try {
              const raw = await deps.assessImage(assessmentImage.buffer, assessmentImage.mimeType, customCropResult.data ?? cropType, observationsResult.data, requestId);
              providerElapsedMs = Math.max(0, Math.round(performance.now() - providerStartedAt));
              const parsed = assessmentSchema.safeParse(raw);
              if (!parsed.success) throw new ProviderError('INVALID_MODEL_RESPONSE', 502, 'The assessment could not be validated. You can retry this scan.');
              try {
                await deps.saveAssessment(uid, scanId, parsed.data);
              } catch (error) {
                // Firestore may commit before its acknowledgement is lost. A
                // validated readback keeps that completed result authoritative.
                const saved = await readSavedAssessment(uid, scanId);
                if (saved) return res.status(200).json({ assessment: saved });
                logFirestoreFailure('save_assessment', error);
                logAssessmentEvent('warn', 'assessment_failed', requestId, {
                  failureCategory: 'ASSESSMENT_SAVE_FAILED',
                  httpStatus: 503,
                  providerElapsedMs,
                  imagePreparationMs: assessmentImage.processingMs,
                  totalElapsedMs: Math.max(0, Math.round(performance.now() - requestStartedAt)),
                });
                await deps.failScan(uid, scanId, 'Your result could not be saved. You can retry this scan.')
                  .catch((failure: unknown) => logFirestoreFailure('mark_save_failure', failure));
                return sendError(res, 503, 'ASSESSMENT_SAVE_FAILED', 'Your assessment could not be saved to your account. Retry this scan when your connection is ready.', true);
              }
              logAssessmentEvent('info', 'assessment_completed', requestId, {
                providerElapsedMs,
                imagePreparationMs: assessmentImage.processingMs,
                totalElapsedMs: Math.max(0, Math.round(performance.now() - requestStartedAt)),
              });
              return res.status(200).json({ assessment: parsed.data });
            } catch (error) {
              const failure = error instanceof ProviderError
                ? error
                : new ProviderError('ASSESSMENT_FAILED', 502, 'The crop assessment service could not complete this request. Try again later.');
              providerElapsedMs ??= Math.max(0, Math.round(performance.now() - providerStartedAt));
              logAssessmentEvent('warn', 'assessment_failed', requestId, {
                failureCategory: failure.code,
                httpStatus: failure.status,
                providerElapsedMs,
                imagePreparationMs: assessmentImage.processingMs,
                totalElapsedMs: Math.max(0, Math.round(performance.now() - requestStartedAt)),
              });
              await deps.failScan(uid, scanId, failure.publicMessage)
                .catch((updateError: unknown) => logFirestoreFailure('mark_assessment_failure', updateError));
              return sendError(res, failure.status, failure.code, failure.publicMessage, failure.retryable);
            }
          } finally {
            req.file = undefined;
          }
        })().catch(() => sendError(res, 500, 'INTERNAL_ERROR', 'The request could not be completed.'));
      });
    }).catch((error: unknown) => sendAuthenticationError(res, error));
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

async function authenticatedUid(
  req: express.Request, res: express.Response, deps: AnalyzeDependencies, missingMessage: string,
): Promise<string | null> {
  const tokenMatch = /^Bearer\s+(\S+)$/i.exec(req.header('authorization') ?? '');
  if (!tokenMatch) {
    sendError(res, 401, 'AUTH_REQUIRED', missingMessage);
    return null;
  }
  try { return (await deps.verifyIdToken(tokenMatch[1]!)).uid; }
  catch (error) { sendAuthenticationError(res, error); return null; }
}

function isOwnedPhotoPath(path: string, uid: string, scanId: string): boolean {
  return path === `users/${uid}/scans/${scanId}/photo`;
}
