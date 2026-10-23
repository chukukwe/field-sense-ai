import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, beforeEach, test } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

const DEMO_PROJECT_ID = 'demo-fieldvoice-rules-test';
const configuredProjectIds = [
  process.env.GCLOUD_PROJECT,
  process.env.GOOGLE_CLOUD_PROJECT,
  process.env.FIREBASE_PROJECT,
].filter(Boolean);

if (configuredProjectIds.length === 0 || configuredProjectIds.some((id) => id !== DEMO_PROJECT_ID)) {
  throw new Error(`Rules tests only run with ${DEMO_PROJECT_ID}; project configuration is missing or does not match the demo ID.`);
}
if (!['127.0.0.1:8080', 'localhost:8080'].includes(process.env.FIRESTORE_EMULATOR_HOST)) {
  throw new Error('Rules tests require FIRESTORE_EMULATOR_HOST and must run through npm run test:rules.');
}
if (process.env.FIREBASE_CONFIG) {
  let firebaseConfig;
  try {
    firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
  } catch {
    throw new Error('Rules tests stopped because FIREBASE_CONFIG could not be verified as local demo configuration.');
  }
  if (firebaseConfig.projectId && firebaseConfig.projectId !== DEMO_PROJECT_ID) {
    throw new Error('Rules tests stopped because FIREBASE_CONFIG names a non-demo project.');
  }
}

const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
const testEnv = await initializeTestEnvironment({
  projectId: DEMO_PROJECT_ID,
  firestore: { rules },
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

after(async () => {
  await testEnv.cleanup();
});

async function assertDeniedWithoutRuleEvaluationError(request, label) {
  const error = await assertFails(request);
  assert.doesNotMatch(error.message, /evaluation error|maximum of 1000 expressions/i, `${label} must be denied by a completed rule evaluation`);
}

function profile(overrides = {}) {
  return {
    fullName: 'Test Farmer',
    email: 'farmer@example.test',
    role: 'farmer',
    location: 'Eket',
    preferredLanguage: 'en',
    accentGuidance: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

function scan(overrides = {}) {
  return {
    title: 'Crop observation',
    cropType: 'Cassava',
    date: '2026-04-01',
    status: 'Observation',
    statusVariant: 'amber',
    summary: 'Assessment unavailable.',
    footerIcon: 'clock',
    footerStatus: 'Pending',
    footerActionLabel: 'Review',
    imageUrl: '',
    dataScope: 'cloud',
    assessmentStatus: 'unavailable',
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

test('owners can create, read, and update their own profile while identity fields remain fixed', async () => {
  const db = testEnv.authenticatedContext('farmer-a').firestore();
  const ref = doc(db, 'users', 'farmer-a');
  await assertSucceeds(setDoc(ref, profile()));
  const created = (await assertSucceeds(getDoc(ref))).data();
  assert.equal(created?.fullName, 'Test Farmer');

  await assertSucceeds(updateDoc(ref, { fullName: 'Updated Farmer', updatedAt: serverTimestamp() }));
  assert.equal((await assertSucceeds(getDoc(ref))).data()?.fullName, 'Updated Farmer');
  await assertFails(updateDoc(ref, { email: 'changed@example.test', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(ref, { createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
  await assertDeniedWithoutRuleEvaluationError(deleteDoc(ref), 'profile deletion');
});

test('profile validation and owner isolation remain enforced', async () => {
  const ownerDb = testEnv.authenticatedContext('farmer-a').firestore();
  const ownerRef = doc(ownerDb, 'users', 'farmer-a');
  await assertFails(setDoc(ownerRef, profile({ extra: true })));
  await assertFails(setDoc(ownerRef, profile({ accentGuidance: 'false' })));

  const otherDb = testEnv.authenticatedContext('farmer-b').firestore();
  const otherRef = doc(otherDb, 'users', 'farmer-a');
  await assertDeniedWithoutRuleEvaluationError(getDoc(otherRef), 'cross-user profile read');
  await assertDeniedWithoutRuleEvaluationError(setDoc(otherRef, profile()), 'cross-user profile write');
  await assertDeniedWithoutRuleEvaluationError(updateDoc(otherRef, { fullName: 'Changed' }), 'cross-user profile update');
  await assertDeniedWithoutRuleEvaluationError(deleteDoc(otherRef), 'cross-user profile deletion');

  const anonymousDb = testEnv.unauthenticatedContext().firestore();
  await assertDeniedWithoutRuleEvaluationError(getDoc(doc(anonymousDb, 'users', 'farmer-a')), 'unauthenticated profile read');
  await assertDeniedWithoutRuleEvaluationError(setDoc(doc(anonymousDb, 'users', 'farmer-a'), profile()), 'unauthenticated profile write');
});

test('owners can create, read, update, and delete their own scan metadata', async () => {
  const db = testEnv.authenticatedContext('farmer-a').firestore();
  const ref = doc(db, 'users', 'farmer-a', 'scans', 'scan-1');
  await assertSucceeds(setDoc(ref, scan()));
  assert.equal((await assertSucceeds(getDoc(ref))).data()?.assessmentStatus, 'unavailable');
  await assertSucceeds(updateDoc(ref, { summary: 'Updated observation.', updatedAt: serverTimestamp() }));
  assert.equal((await assertSucceeds(getDoc(ref))).data()?.summary, 'Updated observation.');
  await assertSucceeds(deleteDoc(ref));
  assert.equal((await assertSucceeds(getDoc(ref))).exists(), false);
});

test('scan metadata validation, path binding, and owner isolation remain enforced', async () => {
  const ownerDb = testEnv.authenticatedContext('farmer-a').firestore();
  const ref = doc(ownerDb, 'users', 'farmer-a', 'scans', 'scan-1');
  await assertFails(setDoc(ref, scan({ fabricatedDiagnosis: 'blight' })));
  await assertFails(setDoc(ref, scan({ assessmentStatus: 'complete' })));
  await assertFails(setDoc(ref, scan({ cloudPhotoPath: 'users/farmer-b/scans/scan-1/photo' })));

  await assertSucceeds(setDoc(ref, scan({ cloudPhotoPath: 'users/farmer-a/scans/scan-1/photo' })));
  const otherDb = testEnv.authenticatedContext('farmer-b').firestore();
  const otherRef = doc(otherDb, 'users', 'farmer-a', 'scans', 'scan-1');
  await assertDeniedWithoutRuleEvaluationError(getDoc(otherRef), 'cross-user scan read');
  await assertDeniedWithoutRuleEvaluationError(updateDoc(otherRef, { summary: 'Unauthorized' }), 'cross-user scan update');
  await assertDeniedWithoutRuleEvaluationError(deleteDoc(otherRef), 'cross-user scan deletion');

  const anonymousDb = testEnv.unauthenticatedContext().firestore();
  const anonymousRef = doc(anonymousDb, 'users', 'farmer-a', 'scans', 'scan-1');
  await assertDeniedWithoutRuleEvaluationError(getDoc(anonymousRef), 'unauthenticated scan read');
  await assertDeniedWithoutRuleEvaluationError(setDoc(anonymousRef, scan()), 'unauthenticated scan write');
  await assertDeniedWithoutRuleEvaluationError(deleteDoc(anonymousRef), 'unauthenticated scan deletion');
});

test('custom crop names are bounded, belong only to Other scans, and remain owner-scoped', async () => {
  const ownerDb = testEnv.authenticatedContext('farmer-a').firestore();
  const customCropRef = doc(ownerDb, 'users', 'farmer-a', 'scans', 'custom-crop');
  await assertSucceeds(setDoc(customCropRef, scan({ cropType: 'Other', customCropName: 'Okra' })));
  assert.equal((await assertSucceeds(getDoc(customCropRef))).data()?.customCropName, 'Okra');

  await assertFails(setDoc(doc(ownerDb, 'users', 'farmer-a', 'scans', 'wrong-crop'), scan({ customCropName: 'Okra' })));
  await assertFails(setDoc(doc(ownerDb, 'users', 'farmer-a', 'scans', 'blank-name'), scan({ cropType: 'Other', customCropName: '' })));
  await assertFails(setDoc(doc(ownerDb, 'users', 'farmer-a', 'scans', 'long-name'), scan({ cropType: 'Other', customCropName: 'a'.repeat(81) })));
  const otherDb = testEnv.authenticatedContext('farmer-b').firestore();
  await assertDeniedWithoutRuleEvaluationError(
    setDoc(doc(otherDb, 'users', 'farmer-a', 'scans', 'custom-crop'), scan({ cropType: 'Other', customCropName: 'Okra' })),
    'cross-user custom crop write',
  );
});

test('Rules test harness is fixed to the demo project and never the production project', () => {
  assert.equal(DEMO_PROJECT_ID, 'demo-fieldvoice-rules-test');
  assert.notEqual(DEMO_PROJECT_ID, 'fieldvoice-ai-4bed1');
});
