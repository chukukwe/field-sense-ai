import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { after, test } from 'node:test';
import { Window } from 'happy-dom';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';

const browserWindow = new Window({ url: 'http://localhost/' });
for (const [name, value] of Object.entries({
  window: browserWindow, document: browserWindow.document, navigator: browserWindow.navigator,
  HTMLElement: browserWindow.HTMLElement, Node: browserWindow.Node,
  Event: browserWindow.Event, MouseEvent: browserWindow.MouseEvent,
  IS_REACT_ACT_ENVIRONMENT: true,
})) Object.defineProperty(globalThis, name, { configurable: true, value, writable: true });

const viteServer = await createServer({
  configFile: false,
  root: fileURLToPath(new URL('../../', import.meta.url)),
  appType: 'custom',
  plugins: [{
    name: 'recovery-photo-store-fixture',
    load(id) {
      if (!id.replaceAll('\\', '/').endsWith('/src/data/photoStore.ts')) return null;
      return `const photos = new Map();
        let failRead = false;
        export function setReadFailure(value) { failRead = value; }
        export async function saveScanPhoto(id, photo) { photos.set(id, photo); }
        export async function getScanPhoto(id) { if (failRead) throw new Error('Device storage unavailable'); return photos.get(id); }
        export async function deleteScanPhoto(id) { photos.delete(id); }`;
    },
  }, react()],
  server: { middlewareMode: true, hmr: false, ws: false },
});
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { act, createElement, useCallback, useState } = React;
const { MemoryRouter, Route, Routes } = await viteServer.ssrLoadModule('/node_modules/react-router-dom/dist/index.mjs');
const { AppContext } = await viteServer.ssrLoadModule('/src/context/AppContextStore.ts');
const { AuthContext } = await viteServer.ssrLoadModule('/src/context/AuthContextStore.ts');
const { ScanDetailsScreen } = await viteServer.ssrLoadModule('/src/pages/ScanDetailsScreen.tsx');
const { CropAssessmentScreen } = await viteServer.ssrLoadModule('/src/pages/CropAssessmentScreen.tsx');
const { HistoryScreen } = await viteServer.ssrLoadModule('/src/pages/HistoryScreen.tsx');
const { sortScansNewestFirst } = await viteServer.ssrLoadModule('/src/data/scanOrdering.ts');
const { loadAssessmentPhoto } = await viteServer.ssrLoadModule('/src/data/loadAssessmentPhoto.ts');
const { mergeCloudScans } = await viteServer.ssrLoadModule('/src/data/scanCache.ts');
const { saveScanPhoto, setReadFailure } = await viteServer.ssrLoadModule('/src/data/photoStore.ts');

after(async () => {
  await viteServer.close();
  await browserWindow.happyDOM.abort();
});

const photo = new Blob(['mock photo'], { type: 'image/png' });
const result = {
  status: 'completed', cropIdentification: 'Cassava', observedSymptoms: ['Mock leaf observation'],
  possibleCauses: [{ name: 'Mock cause', explanation: 'Mock explanation.', likelihood: 'possible' }],
  confidence: 'moderate', confidenceReason: 'Mock visible evidence.', summary: 'Recovered crop assessment.',
  recommendedActions: ['Inspect nearby leaves.'], preventionTips: ['Use clean tools.'],
  whenToSeekHelp: 'Contact a local adviser if symptoms spread.', limitations: ['Test fixture only.'],
  disclaimer: 'Mock assessment, not a diagnosis.',
};
const user = { uid: 'recovery-user', async getIdToken() { return 'recovery-token'; } };
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { resolve, promise };
}
function makeScan(status = 'pending') {
  return {
    id: `scan-recovery-${status}`, title: 'Cassava Leaf', cropType: 'Cassava', date: 'Today',
    status: 'Observation', statusVariant: 'amber', summary: 'Your scan is saved.',
    footerIcon: 'clock', footerStatus: 'Ready to check', footerActionLabel: 'See result',
    imageUrl: URL.createObjectURL(photo), photoStorageKey: `recovery-user/scan-recovery-${status}`,
    photoScope: 'local-only', dataScope: 'local-only', assessmentStatus: status,
  };
}
function RecoveryFixture({ scan, onReset = () => {} }) {
  const [scans, setScans] = useState([scan]);
  const applyAssessment = useCallback((id, assessment, status, summary, failure) => {
    setScans((previous) => previous.map((item) => item.id !== id ? item : {
      ...item, ...(assessment ? { assessment } : {}), assessmentStatus: status,
      summary, assessmentFailure: failure,
    }));
  }, []);
  const context = {
    scans, applyAssessment, resetScanDraft: onReset,
    markScanFailed: async (id, summary, failure) => applyAssessment(id, undefined, 'failed', summary, failure),
    markPhotoSynced: (id, cloudPhotoPath) => setScans((previous) => previous.map((item) => item.id !== id ? item : { ...item, cloudPhotoPath, photoScope: 'cloud' })),
    markPhotoStoredLocally() {}, deleteScan: async () => false, setActiveModal() {}, setHelpModalOpen() {},
  };
  return createElement(AppContext.Provider, { value: context },
    createElement(AuthContext.Provider, { value: { user, loading: false, configured: true } },
      createElement(Routes, null,
        createElement(Route, { path: '/scan/:id', element: createElement(ScanDetailsScreen) }),
        createElement(Route, { path: '/assessment/:id', element: createElement(CropAssessmentScreen) }),
        createElement(Route, { path: '/scan', element: createElement('p', null, 'Fresh scan form') }))));
}
function mountScan(scan, page = 'scan', onReset) {
  const host = browserWindow.document.createElement('div');
  browserWindow.document.body.append(host);
  const root = createRoot(host);
  return {
    host,
    async render() {
      await act(async () => root.render(createElement(MemoryRouter, { initialEntries: [`/${page}/${scan.id}`] },
        createElement(RecoveryFixture, { scan, onReset }))));
    },
    async unmount() {
      await act(async () => root.unmount()); host.remove(); URL.revokeObjectURL(scan.imageUrl);
    },
  };
}
function button(host, label) {
  const found = [...host.querySelectorAll('button')].find((item) => item.textContent.trim() === label);
  assert.ok(found, `Expected ${label} button`);
  return found;
}
async function click(host, label, twice = false) {
  await act(async () => {
    const target = button(host, label);
    target.dispatchEvent(new browserWindow.MouseEvent('click', { bubbles: true }));
    if (twice) target.dispatchEvent(new browserWindow.MouseEvent('click', { bubbles: true }));
  });
}

test('assessment recovery bypasses a failed device cache and can fall back through both account providers', async () => {
  const calls = [];
  const recovered = await loadAssessmentPhoto({ id: 'scan-fallback', photoStorageKey: 'local', cloudPhotoPath: 'cloud', firebasePhotoPath: 'firebase' }, {
    local: async () => { calls.push('local'); throw new Error('IndexedDB blocked'); },
    cloud: async () => { calls.push('cloud'); throw new Error('Supabase unavailable'); },
    firebase: async () => { calls.push('firebase'); return photo; },
  });
  assert.equal(recovered, photo);
  assert.deepEqual(calls, ['local', 'cloud', 'firebase']);
});

test('assessment recovery stops at the first usable photo and keeps a meaningful final failure', async () => {
  const sources = {
    local: async () => photo,
    cloud: async () => { throw new Error('Cloud photo unavailable'); },
    firebase: async () => { throw new Error('Legacy photo unavailable'); },
  };
  assert.equal(await loadAssessmentPhoto({ id: 'scan-local', photoStorageKey: 'local', cloudPhotoPath: 'cloud' }, sources), photo);
  await assert.rejects(loadAssessmentPhoto({ id: 'scan-missing', cloudPhotoPath: 'cloud' }, sources), /Cloud photo unavailable/);
  assert.equal(await loadAssessmentPhoto({ id: 'scan-no-photo' }, sources), undefined);
});

test('cloud recovery clears obsolete local failure details without losing the selected preview', () => {
  const local = { ...makeScan('failed'), assessmentFailure: { code: 'ASSESSMENT_TIMEOUT', status: 504 } };
  for (const status of ['processing', 'completed', 'inconclusive']) {
    const [merged] = mergeCloudScans([{ ...local, imageUrl: '', dataScope: 'cloud', assessmentStatus: status, assessmentFailure: undefined }], [local], []);
    assert.equal(merged.assessmentFailure, undefined);
    assert.equal(merged.imageUrl, local.imageUrl);
  }
  const [failed] = mergeCloudScans([{ ...local, dataScope: 'cloud', assessmentFailure: undefined }], [local], []);
  assert.equal(failed.assessmentFailure.code, 'ASSESSMENT_TIMEOUT');
  URL.revokeObjectURL(local.imageUrl);
});

test('an interrupted scan resumes from history, keeps progress visible and shows its result before photo sync finishes', { timeout: 5000 }, async () => {
  const scan = makeScan();
  await saveScanPhoto(scan.photoStorageKey, photo);
  const assessment = deferred();
  const upload = deferred();
  let assessmentCalls = 0;
  let uploadCalls = 0;
  let resets = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    if (String(input).endsWith('/api/analyze-crop')) { assessmentCalls++; return assessment.promise; }
    if (String(input).endsWith('/photo') && init?.method === 'POST') { uploadCalls++; return upload.promise; }
    throw new Error(`Unexpected request ${input}`);
  };
  const mount = mountScan(scan, 'scan', () => { resets++; });
  try {
    await mount.render();
    await click(mount.host, 'Check crop', true);
    assert.equal(assessmentCalls, 1, 'same-tick taps must reuse one request');
    assert.ok(mount.host.querySelector('[role="progressbar"]'), 'processing state must retain the retry progress');
    assert.match(mount.host.textContent, /Checking your crop/);
    await act(async () => { assessment.resolve(Response.json({ assessment: result })); await delay(510); });
    assert.match(mount.host.textContent, /Recovered crop assessment/);
    assert.equal(uploadCalls, 1);
    assert.equal(mount.host.querySelector('[role="progressbar"]'), null, 'photo sync must not retain the assessment spinner');
    await click(mount.host, 'Scan Another Crop');
    assert.equal(resets, 1);
    assert.match(mount.host.textContent, /Fresh scan form/);
  } finally {
    assessment.resolve(new Response(null, { status: 503 }));
    upload.resolve(new Response(null, { status: 503 }));
    await mount.unmount(); globalThis.fetch = originalFetch;
  }
});

test('an account scan already being processed retains an actionable recovery state from history', async () => {
  const scan = makeScan('processing');
  await saveScanPhoto(scan.photoStorageKey, photo);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => String(input).endsWith('/api/analyze-crop')
    ? Response.json({ error: { code: 'ALREADY_PROCESSING', message: 'Still checking.', retryable: true } }, { status: 409 })
    : new Response(null, { status: 503 });
  const mount = mountScan(scan);
  try {
    await mount.render(); await click(mount.host, 'Check again');
    assert.match(mount.host.textContent, /Your crop is still being checked/);
    assert.ok(button(mount.host, 'Check again'));
    assert.equal(mount.host.querySelector('[role="progressbar"]'), null);
  } finally { await mount.unmount(); globalThis.fetch = originalFetch; }
});

test('the assessment page retries a saved account photo when IndexedDB is unavailable', { timeout: 5000 }, async () => {
  const scan = { ...makeScan('failed'), cloudPhotoPath: 'users/recovery-user/scans/test/photo' };
  setReadFailure(true);
  let downloads = 0;
  let assessments = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    if (String(input).endsWith('/photo') && init?.method === 'GET') { downloads++; return new Response(photo); }
    if (String(input).endsWith('/api/analyze-crop')) { assessments++; return Response.json({ assessment: result }); }
    throw new Error(`Unexpected request ${input}`);
  };
  const mount = mountScan(scan, 'assessment');
  try {
    await mount.render(); await click(mount.host, 'Try again');
    await act(async () => { await delay(510); });
    assert.match(mount.host.textContent, /Recovered crop assessment/);
    assert.equal(downloads, 1); assert.equal(assessments, 1);
    await click(mount.host, 'Scan details');
    assert.match(mount.host.textContent, /Scan Details/);
  } finally { await mount.unmount(); globalThis.fetch = originalFetch; setReadFailure(false); }
});

for (const page of ['scan', 'assessment']) {
  test(page + ' recovery keeps an authenticated retry available alongside an optional sample', async () => {
    const scan = { ...makeScan('failed'), assessmentFailure: { code: 'GEMINI_TIMEOUT', status: 504 } };
    const mount = mountScan(scan, page);
    try {
      await mount.render();
      assert.ok(button(mount.host, 'Try again'));
      assert.ok(button(mount.host, 'View sample result'));
      assert.equal(scan.assessment, undefined);
      assert.doesNotMatch(mount.host.textContent, /Dry, brown edges on cassava leaves/);
    } finally { await mount.unmount(); }
  });
}

test('scan ordering retains timestamp precision for unique scan IDs and legacy records', () => {
  const scans = [
    { id: 'scan-1792868001000-123e4567-e89b-12d3-a456-426614174000', date: '24th Oct, 2026' },
    { id: 'scan-1792868003000', date: '24th Oct, 2026' },
    { id: 'scan-1792868002000-123e4567-e89b-12d3-a456-426614174001', date: '24th Oct, 2026' },
  ];
  assert.deepEqual(sortScansNewestFirst(scans).map((item) => item.id), [scans[1].id, scans[2].id, scans[0].id]);
  assert.deepEqual(scans.map((item) => item.id), [scans[0].id, scans[1].id, scans[2].id]);
});

test('history filters every supported crop, including maize, vegetables and custom crops', async () => {
  const crops = ['Cassava', 'Plantain', 'Maize', 'Vegetables', 'Other'];
  const scans = crops.map((cropType, index) => ({
    ...makeScan('completed'), id: 'scan-history-' + index,
    cropType, title: cropType + ' saved photo',
  }));
  const host = browserWindow.document.createElement('div');
  browserWindow.document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () => root.render(createElement(MemoryRouter, null,
      createElement(AppContext.Provider, { value: { scans, setHelpModalOpen() {} } },
        createElement(AuthContext.Provider, { value: { user } }, createElement(HistoryScreen))))));
    assert.equal(host.querySelectorAll('h4').length, 5);
    for (const cropType of crops) {
      const label = cropType === 'Other' ? 'Others' : cropType;
      const chip = [...host.querySelectorAll('button')].find((item) => item.textContent.trim() === label + '1');
      assert.ok(chip, label + ' filter should show its scan count');
      await act(async () => chip.dispatchEvent(new browserWindow.MouseEvent('click', { bubbles: true })));
      const titles = [...host.querySelectorAll('h4')].map((item) => item.textContent);
      assert.deepEqual(titles, [cropType + ' saved photo']);
    }
    const all = [...host.querySelectorAll('button')].find((item) => item.textContent.trim() === 'All Crops5');
    assert.ok(all);
    await act(async () => all.dispatchEvent(new browserWindow.MouseEvent('click', { bubbles: true })));
    assert.equal(host.querySelectorAll('h4').length, 5);
  } finally {
    await act(async () => root.unmount()); host.remove();
    for (const scan of scans) URL.revokeObjectURL(scan.imageUrl);
  }
});

test('a queued processing snapshot cannot downgrade the HTTP result while photo references still sync', () => {
  for (const status of ['completed', 'inconclusive']) {
    const local = { ...makeScan(status), assessment: { ...result, status }, summary: 'Validated result summary',
      footerIcon: 'check', footerStatus: 'Crop check ready', footerActionLabel: 'See result' };
    const cloudPhotoPath = 'users/recovery-user/scans/test/photo';
    const [merged] = mergeCloudScans([{ ...local, assessment: undefined, assessmentStatus: 'processing',
      summary: 'Checking your crop', footerIcon: 'clock', footerStatus: 'Checking', footerActionLabel: 'Check again',
      cloudPhotoPath, photoScope: 'cloud', dataScope: 'cloud' }], [local], []);
    assert.equal(merged.assessment, local.assessment);
    assert.equal(merged.assessmentStatus, status);
    assert.equal(merged.summary, local.summary);
    assert.equal(merged.footerStatus, local.footerStatus);
    assert.equal(merged.footerIcon, local.footerIcon);
    assert.equal(merged.footerActionLabel, local.footerActionLabel);
    assert.equal(merged.cloudPhotoPath, cloudPhotoPath);
    assert.equal(merged.photoScope, 'cloud');
    URL.revokeObjectURL(local.imageUrl);
  }
});
