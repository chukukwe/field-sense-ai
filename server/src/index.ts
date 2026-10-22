import 'dotenv/config';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { createApp, ProviderError } from './app.js';
import { assessWithGemini } from './gemini.js';
import { createSupabasePhotoStore } from './supabasePhotoStore.js';
import { createNigeriaReverseGeocoder } from './location.js';
import { getWeatherForecastForLocation, type WeatherRequestLocation } from './weather.js';
import { createNimetService } from './nimet.js';
import { createSeasonRecommendationService } from './seasonRecommendations.js';

const port = Number(process.env.PORT || 8787);
const maxImageMb = Number(process.env.MAX_IMAGE_MB || 8);
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseApiKey = supabaseSecretKey || supabaseServiceKey;
const supabaseBucket = process.env.SUPABASE_PHOTO_BUCKET || 'crop-photos';
const nimet = createNimetService(process.env.NIMET_API_KEY);
const reverseGeocode = createNigeriaReverseGeocoder(
  fetch,
  process.env.NOMINATIM_REVERSE_URL || 'https://nominatim.openstreetmap.org/reverse',
  process.env.NOMINATIM_USER_AGENT || 'FieldVoiceAI/1.0',
);
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!projectId) throw new Error('FIREBASE_PROJECT_ID or GCLOUD_PROJECT is required.');
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port.');
if (!Number.isInteger(maxImageMb) || maxImageMb < 1 || maxImageMb > 20) throw new Error('MAX_IMAGE_MB must be a whole number from 1 to 20.');
if (getApps().length === 0) initializeApp({ credential: applicationDefault(), projectId });

const auth = getAuth();
const db = getFirestore();
const photoStore = supabaseUrl && supabaseApiKey
  ? {
      ...createSupabasePhotoStore({ url: supabaseUrl, apiKey: supabaseApiKey, legacyServiceRoleKey: !supabaseSecretKey, bucket: supabaseBucket }),
      getPhotoRecord: async (uid: string, scanId: string) => {
        const snapshot = await db.doc(`users/${uid}/scans/${scanId}`).get();
        return snapshot.exists ? {
          cloudPhotoPath: typeof snapshot.data()?.cloudPhotoPath === 'string' ? snapshot.data()?.cloudPhotoPath as string : undefined,
        } : null;
      },
      savePhotoReference: async (uid: string, scanId: string, path: string) => {
        await db.doc(`users/${uid}/scans/${scanId}`).update({ cloudPhotoPath: path, photoScope: 'cloud', updatedAt: FieldValue.serverTimestamp() });
      },
      clearPhotoReference: async (uid: string, scanId: string) => {
        await db.doc(`users/${uid}/scans/${scanId}`).update({ cloudPhotoPath: FieldValue.delete(), photoScope: 'local-only', updatedAt: FieldValue.serverTimestamp() });
      },
    }
  : undefined;
const app = createApp({
  allowedOrigins,
  maxImageBytes: maxImageMb * 1024 * 1024,
  seasonRecommendations: createSeasonRecommendationService(),
  getSeasonalRainfall: (request) => nimet.getSeasonalRainfall(request),
  photoStore,
  getWeatherForecast: (() => {
    const cache = new Map<string, { forecast: Awaited<ReturnType<typeof getWeatherForecastForLocation>>; cachedAt: number }>();
    return async (location: WeatherRequestLocation) => {
      const key = location.kind === 'eket' ? 'eket' : `${location.latitude},${location.longitude}`;
      const now = Date.now();
      const cached = cache.get(key);
      if (cached && now - cached.cachedAt < 15 * 60 * 1000) return cached.forecast;
      if (cached) cache.delete(key);
      const next = await getWeatherForecastForLocation(location);
      if (cache.size >= 100) cache.delete(cache.keys().next().value!);
      cache.set(key, { forecast: next, cachedAt: Date.now() });
      return next;
    };
  })(),
  resolveDeviceLocation: reverseGeocode,
  verifyIdToken: async (token) => auth.verifyIdToken(token, true),
  claimScan: async (uid, scanId, cropType) => {
    const ref = db.doc(`users/${uid}/scans/${scanId}`);
    return db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists || snapshot.data()?.cropType !== cropType) return 'missing';
      const data = snapshot.data()!;
      if (data.assessmentStatus === 'completed' || data.assessmentStatus === 'inconclusive' || data.assessment) return 'complete';
      if (data.assessmentStatus === 'processing') {
        const processingStartedAt = data.processingStartedAt?.toDate?.() as Date | undefined;
        if (!processingStartedAt || Date.now() - processingStartedAt.getTime() < 10 * 60 * 1000) return 'processing';
      }
      transaction.update(ref, {
        assessmentStatus: 'processing',
        processingStartedAt: FieldValue.serverTimestamp(),
        summary: 'Your crop photo is being assessed.',
        footerStatus: 'Analysis in progress',
        footerIcon: 'clock',
        updatedAt: FieldValue.serverTimestamp(),
      });
      return 'claimed';
    });
  },
  saveAssessment: async (uid, scanId, assessment) => {
    await db.doc(`users/${uid}/scans/${scanId}`).update({
      assessment,
      assessmentStatus: assessment.status,
      summary: assessment.summary,
      footerStatus: assessment.status === 'inconclusive' ? 'Assessment inconclusive' : 'Assessment ready',
      footerIcon: assessment.status === 'inconclusive' ? 'alert' : 'check',
      footerActionLabel: 'View assessment',
      updatedAt: FieldValue.serverTimestamp(),
    });
  },
  failScan: async (uid, scanId) => {
    await db.doc(`users/${uid}/scans/${scanId}`).update({
      assessmentStatus: 'failed',
      summary: 'The assessment could not be completed. Your saved photo and scan details are still available.',
      footerStatus: 'Analysis failed',
      footerIcon: 'alert',
      footerActionLabel: 'Retry assessment',
      updatedAt: FieldValue.serverTimestamp(),
    });
  },
  assessImage: (image, mime, crop, observations) => {
    if (!apiKey) throw new ProviderError('GEMINI_NOT_CONFIGURED', 503, 'The assessment service is not configured yet. Contact the app administrator.');
    return assessWithGemini(image, mime, crop, observations, apiKey, model);
  },
});

app.listen(port, () => console.info(`Field Sense assessment API listening on port ${port}.`));
