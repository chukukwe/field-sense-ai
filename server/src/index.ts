import 'dotenv/config';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { createApp, ProviderError } from './app.js';
import { assessWithGemini } from './gemini.js';

const port = Number(process.env.PORT || 8787);
const maxImageMb = Number(process.env.MAX_IMAGE_MB || 8);
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
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
const app = createApp({
  allowedOrigins,
  maxImageBytes: maxImageMb * 1024 * 1024,
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
