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
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  }));
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
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
