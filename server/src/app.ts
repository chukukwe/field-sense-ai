import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import { z } from 'zod';
import { assessmentSchema, cropTypes, type CropAssessmentResult } from './assessmentSchema.js';
import type { DeviceLocationCoordinates, ResolvedNigeriaLocation } from './location.js';
import { NimetServiceError, type SeasonalRainfallRequest, type SeasonalRainfallResult } from './nimet.js';
import type { SeasonRecommendationService } from './seasonRecommendations.js';
import type { WeatherForecast, WeatherRequestLocation } from './weather.js';

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
  weatherLimiterMax?: number;
  maxImageBytes?: number;
  photoStore?: PhotoStoreDependencies;
  getWeatherForecast?: (location: WeatherRequestLocation) => Promise<WeatherForecast>;
  resolveDeviceLocation?: (coordinates: DeviceLocationCoordinates) => Promise<ResolvedNigeriaLocation | null>;
  seasonRecommendations?: SeasonRecommendationService;
  getSeasonalRainfall?: (request: SeasonalRainfallRequest) => Promise<SeasonalRainfallResult>;
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
  const weatherAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    void authenticatedUid(req, deps).then((uid) => {
      if (!uid) return sendError(res, 401, 'AUTH_REQUIRED', 'Sign in again to view the local forecast.');
      (req as express.Request & { weatherUid?: string }).weatherUid = uid;
      next();
    }).catch(() => sendError(res, 401, 'AUTH_INVALID', 'Your sign-in has expired. Sign in again to continue.'));
  };
  const weatherLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: deps.weatherLimiterMax ?? 30,
    keyGenerator: (req) => (req as express.Request & { weatherUid?: string }).weatherUid ?? 'unverified',
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  });
  const locationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: Math.min(deps.weatherLimiterMax ?? 30, 10),
    keyGenerator: (req) => (req as express.Request & { weatherUid?: string }).weatherUid ?? 'unverified',
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  });
  // The season calendar is shared draft reference data, not user data. Keep it
  // readable without an account so Firebase sign-in cannot block the selectors.
  const seasonDataLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    // The state/LGA selectors are shared reference data. A single IP can
    // legitimately request many LGAs while exploring locations, so keep a
    // generous limit here without changing weather or authenticated limits.
    limit: 300,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  });
  app.get('/api/season/states', seasonDataLimiter, (_req, res) => {
    if (!deps.seasonRecommendations) return sendError(res, 503, 'SEASON_DATA_UNAVAILABLE', 'Season planning data is not available right now.', true);
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.json({ states: deps.seasonRecommendations.listStates() });
  });
  app.get('/api/season/states/:stateId/lgas', seasonDataLimiter, (req, res) => {
    if (!deps.seasonRecommendations) return sendError(res, 503, 'SEASON_DATA_UNAVAILABLE', 'Season planning data is not available right now.', true);
    const stateIdParam = req.params.stateId;
    const stateId = typeof stateIdParam === 'string' && /^\d+$/.test(stateIdParam) ? Number(stateIdParam) : NaN;
    if (!Number.isSafeInteger(stateId) || stateId < 1) return sendError(res, 400, 'STATE_INVALID', 'Choose a valid state.');
    const result = deps.seasonRecommendations.listLgas(stateId);
    if (!result) return sendError(res, 404, 'STATE_NOT_FOUND', 'That state was not found in the crop database.');
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.json(result);
  });
  app.get('/api/season/recommendations/:lgaId', seasonDataLimiter, (req, res) => {
    if (!deps.seasonRecommendations) return sendError(res, 503, 'SEASON_DATA_UNAVAILABLE', 'Season planning data is not available right now.', true);
    const lgaIdParam = req.params.lgaId;
    const lgaId = typeof lgaIdParam === 'string' && /^\d+$/.test(lgaIdParam) ? Number(lgaIdParam) : NaN;
    if (!Number.isSafeInteger(lgaId) || lgaId < 1) return sendError(res, 400, 'LGA_INVALID', 'Choose a valid local government area.');
    const plan = deps.seasonRecommendations.getPlan(lgaId);
    if (!plan) return sendError(res, 404, 'LGA_NOT_FOUND', 'That local government area was not found in the crop database.');
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.json(plan);
  });
  app.get('/api/season/rainfall', seasonDataLimiter, (req, res) => {
    void (async () => {
      if (!deps.seasonRecommendations) return sendError(res, 503, 'SEASON_DATA_UNAVAILABLE', 'Season planning data is not available right now.', true);
      const lgaId = typeof req.query.lgaId === 'string' && /^\d+$/.test(req.query.lgaId) ? Number(req.query.lgaId) : NaN;
      const year = typeof req.query.year === 'string' && /^\d{4}$/.test(req.query.year) ? Number(req.query.year) : NaN;
      if (!Number.isSafeInteger(lgaId) || lgaId < 1) return sendError(res, 400, 'LGA_INVALID', 'Choose a valid local government area.');
      if (!Number.isSafeInteger(year) || year < 2000 || year > 2100) return sendError(res, 400, 'YEAR_INVALID', 'Choose a valid year.');
      const plan = deps.seasonRecommendations.getPlan(lgaId);
      if (!plan) return sendError(res, 404, 'LGA_NOT_FOUND', 'That local government area was not found in the crop database.');
      if (!deps.getSeasonalRainfall) return sendError(res, 503, 'NIMET_NOT_CONFIGURED', 'NiMet data is not set up yet. Add NIMET_API_KEY to the backend environment, then restart the server.', true);
      try {
        const result = await deps.getSeasonalRainfall({ state: plan.location.state, lga: plan.location.lga, year });
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.json(result);
      } catch (error) {
        if (error instanceof NimetServiceError) return sendError(res, error.status, error.code, error.publicMessage, error.retryable);
        return sendError(res, 503, 'NIMET_UNAVAILABLE', 'NiMet could not return rainfall data right now. Try again later.', true);
      }
    })().catch(() => sendError(res, 503, 'NIMET_UNAVAILABLE', 'NiMet could not return rainfall data right now. Try again later.', true));
  });
  app.post('/api/season/location', weatherAuth, locationLimiter, (req, res) => {
    express.json({ limit: '1kb' })(req, res, (error?: unknown) => {
      void (async () => {
        if (error) return sendError(res, 400, 'LOCATION_INVALID', 'The device location could not be read. Try again.');
        const body: unknown = req.body;
        if (typeof body !== 'object' || body === null || Array.isArray(body)) return sendError(res, 400, 'LOCATION_INVALID', 'A valid device location is required.');
        const coordinates = body as { latitude?: unknown; longitude?: unknown };
        if (Object.keys(body).some((key) => key !== 'latitude' && key !== 'longitude')
          || typeof coordinates.latitude !== 'number' || !Number.isFinite(coordinates.latitude)
          || coordinates.latitude < -90 || coordinates.latitude > 90
          || typeof coordinates.longitude !== 'number' || !Number.isFinite(coordinates.longitude)
          || coordinates.longitude < -180 || coordinates.longitude > 180) {
          return sendError(res, 400, 'LOCATION_INVALID', 'The device returned invalid coordinates. Try again.');
        }
        if (!deps.resolveDeviceLocation) return sendError(res, 503, 'LOCATION_UNAVAILABLE', 'Your farming zone could not be identified. Weather can still be used. Try again later.', true);
        try {
          const location = await deps.resolveDeviceLocation({ latitude: coordinates.latitude, longitude: coordinates.longitude });
          res.setHeader('Cache-Control', 'private, no-store');
          return res.json({ location });
        } catch {
          return sendError(res, 503, 'LOCATION_UNAVAILABLE', 'Your farming zone could not be identified right now. Weather can still be used. Try again later.', true);
        }
      })().catch(() => sendError(res, 503, 'LOCATION_UNAVAILABLE', 'Your farming zone could not be identified right now. Weather can still be used. Try again later.', true));
    });
  });
  const sendWeatherForecast = (res: express.Response, location: WeatherRequestLocation) => {
    void (async () => {
      if (!deps.getWeatherForecast) return sendError(res, 503, 'WEATHER_UNAVAILABLE', 'The weather forecast is temporarily unavailable. Try again later.', true);
      try {
        const forecast = await deps.getWeatherForecast(location);
        res.setHeader('Cache-Control', 'private, no-store');
        return res.json(forecast);
      } catch { return sendError(res, 503, 'WEATHER_UNAVAILABLE', 'The weather forecast is temporarily unavailable. Try again later.', true); }
    })().catch(() => sendError(res, 503, 'WEATHER_UNAVAILABLE', 'The weather forecast is temporarily unavailable. Try again later.', true));
  };
  app.get('/api/season/weather', weatherAuth, weatherLimiter, (req, res) => {
    if (req.query.location !== 'eket') return sendError(res, 400, 'LOCATION_UNSUPPORTED', 'Enter Eket for sample crop cards, or allow device location for local weather.');
    sendWeatherForecast(res, { kind: 'eket' });
  });
  app.post('/api/season/weather', weatherAuth, weatherLimiter, (req, res) => {
    express.json({ limit: '1kb' })(req, res, (error?: unknown) => {
      if (error) return sendError(res, 400, 'LOCATION_INVALID', 'The device location could not be read. Try again or enter Eket manually.');
      const body: unknown = req.body;
      if (typeof body !== 'object' || body === null || Array.isArray(body)) return sendError(res, 400, 'LOCATION_INVALID', 'A valid device location is required.');
      const coordinates = body as { latitude?: unknown; longitude?: unknown };
      if (Object.keys(body).some((key) => key !== 'latitude' && key !== 'longitude')
        || typeof coordinates.latitude !== 'number' || !Number.isFinite(coordinates.latitude)
        || coordinates.latitude < -90 || coordinates.latitude > 90
        || typeof coordinates.longitude !== 'number' || !Number.isFinite(coordinates.longitude)
        || coordinates.longitude < -180 || coordinates.longitude > 180) {
        return sendError(res, 400, 'LOCATION_INVALID', 'The device returned invalid coordinates. Try again or enter Eket manually.');
      }
      sendWeatherForecast(res, { kind: 'coordinates', latitude: coordinates.latitude, longitude: coordinates.longitude });
    });
  });
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
