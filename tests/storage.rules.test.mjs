import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, beforeEach, test } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteObject, getBytes, getMetadata, ref, uploadBytes } from 'firebase/storage';

const DEMO_PROJECT_ID = 'demo-fieldvoice-rules-test';
const configuredProjectIds = [
  process.env.GCLOUD_PROJECT,
  process.env.GOOGLE_CLOUD_PROJECT,
  process.env.FIREBASE_PROJECT,
].filter(Boolean);

if (configuredProjectIds.length === 0 || configuredProjectIds.some((id) => id !== DEMO_PROJECT_ID)) {
  throw new Error(`Storage rules tests only run with ${DEMO_PROJECT_ID}; project configuration is missing or does not match the demo ID.`);
}
const rules = await readFile(new URL('../storage.rules', import.meta.url), 'utf8');
const testEnv = await initializeTestEnvironment({
  projectId: DEMO_PROJECT_ID,
  storage: { rules, host: '127.0.0.1', port: 9199 },
});

beforeEach(async () => {
  await testEnv.clearStorage();
});

after(async () => {
  await testEnv.cleanup();
});

const bucket = `gs://${DEMO_PROJECT_ID}.appspot.com`;
const photoPath = (uid, scanId = 'scan-1') => `users/${uid}/scans/${scanId}/crop-photo`;

test('a signed-in owner can upload, retrieve from a second session, and delete a private photo', async () => {
  const owner = testEnv.authenticatedContext('farmer-a').storage(bucket);
  const secondDevice = testEnv.authenticatedContext('farmer-a').storage(bucket);
  const file = ref(owner, photoPath('farmer-a'));
  const content = 'harmless emulator photo fixture';

  await assertSucceeds(uploadBytes(file, new Blob([content], { type: 'image/png' }), { contentType: 'image/png' }));
  const bytes = await assertSucceeds(getBytes(ref(secondDevice, photoPath('farmer-a'))));
  assert.equal(new TextDecoder().decode(bytes), content);
  assert.equal((await assertSucceeds(getMetadata(ref(secondDevice, photoPath('farmer-a'))))).contentType, 'image/png');
  await assertSucceeds(deleteObject(file));
});

test('unauthenticated and cross-user reads or writes are denied', async () => {
  const owner = testEnv.authenticatedContext('farmer-a').storage(bucket);
  const otherFarmer = testEnv.authenticatedContext('farmer-b').storage(bucket);
  const anonymous = testEnv.unauthenticatedContext().storage(bucket);
  const path = photoPath('farmer-a', 'private-scan');

  await assertFails(uploadBytes(ref(anonymous, path), new Blob(['x'], { type: 'image/png' }), { contentType: 'image/png' }));
  await assertSucceeds(uploadBytes(ref(owner, path), new Blob(['owner photo'], { type: 'image/png' }), { contentType: 'image/png' }));
  await assertFails(getBytes(ref(otherFarmer, path)));
  await assertFails(deleteObject(ref(otherFarmer, path)));
  await assertFails(uploadBytes(ref(otherFarmer, path), new Blob(['overwrite'], { type: 'image/png' }), { contentType: 'image/png' }));
});

test('only non-empty JPEG, PNG, and WebP files up to 8 MiB can be written', async () => {
  const owner = testEnv.authenticatedContext('farmer-a').storage(bucket);
  await assertFails(uploadBytes(ref(owner, photoPath('farmer-a', 'text-file')), new Blob(['not an image'], { type: 'text/plain' }), { contentType: 'text/plain' }));
  await assertFails(uploadBytes(ref(owner, photoPath('farmer-a', 'empty-file')), new Blob([], { type: 'image/png' }), { contentType: 'image/png' }));
  await assertFails(uploadBytes(ref(owner, photoPath('farmer-a', 'large-file')), new Blob([new Uint8Array(8 * 1024 * 1024 + 1)], { type: 'image/jpeg' }), { contentType: 'image/jpeg' }));
});

test('photos outside the account scan-photo path are not publicly readable or writable', async () => {
  const owner = testEnv.authenticatedContext('farmer-a').storage(bucket);
  const anonymous = testEnv.unauthenticatedContext().storage(bucket);
  await assertFails(uploadBytes(ref(owner, 'public/photo.png'), new Blob(['x'], { type: 'image/png' }), { contentType: 'image/png' }));
  await assertFails(getBytes(ref(anonymous, photoPath('farmer-a', 'missing'))));
});
