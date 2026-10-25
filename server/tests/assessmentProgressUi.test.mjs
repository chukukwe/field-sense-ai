import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { after, test } from 'node:test';
import { Window } from 'happy-dom';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';

const browserWindow = new Window({ url: 'http://localhost/' });
Object.defineProperty(globalThis, 'window', { configurable: true, value: browserWindow });
Object.defineProperty(globalThis, 'document', { configurable: true, value: browserWindow.document });
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: browserWindow.navigator });
Object.defineProperty(globalThis, 'HTMLElement', { configurable: true, value: browserWindow.HTMLElement });
Object.defineProperty(globalThis, 'Node', { configurable: true, value: browserWindow.Node });
Object.defineProperty(globalThis, 'Event', { configurable: true, value: browserWindow.Event });
Object.defineProperty(globalThis, 'MouseEvent', { configurable: true, value: browserWindow.MouseEvent });
Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { configurable: true, value: true, writable: true });

const viteServer = await createServer({
  configFile: false,
  root: fileURLToPath(new URL('../../', import.meta.url)),
  appType: 'custom',
  plugins: [{
    name: 'local-photo-store-fixture',
    // Exercise the real scan screens without requiring a browser IndexedDB implementation.
    load(id) {
      if (!id.replaceAll('\\', '/').endsWith('/src/data/photoStore.ts')) return null;
      return `const photos = new Map();
        let reads = 0;
        export async function saveScanPhoto(id, photo) { photos.set(id, photo); }
        export async function getScanPhoto(id) { reads += 1; return photos.get(id); }
        export async function deleteScanPhoto(id) { photos.delete(id); }
        export function photoReadCount() { return reads; }
        export function resetPhotoReadCount() { reads = 0; }`;
    },
  }, react()],
  server: { middlewareMode: true, hmr: false, ws: false },
});
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { AssessmentProgressIndicator } = await viteServer.ssrLoadModule('/src/components/common/AssessmentProgressIndicator.tsx');
const { useAssessmentProgress } = await viteServer.ssrLoadModule('/src/hooks/useAssessmentProgress.ts');
const { requestCropAssessment } = await viteServer.ssrLoadModule('/src/data/assessmentApi.ts');
const { SeasonSenseScreen } = await viteServer.ssrLoadModule('/src/pages/SeasonSenseScreen.tsx');
const { FarmGuidePlanScreen } = await viteServer.ssrLoadModule('/src/pages/FarmGuidePlanScreen.tsx');
const { SampleCropResultScreen } = await viteServer.ssrLoadModule('/src/pages/SampleCropResultScreen.tsx');
const { CropAssessmentScreen } = await viteServer.ssrLoadModule('/src/pages/CropAssessmentScreen.tsx');
const { ScanningScreen } = await viteServer.ssrLoadModule('/src/pages/ScanningScreen.tsx');
const { ScanImage } = await viteServer.ssrLoadModule('/src/components/common/ScanImage.tsx');
const { saveScanPhoto, photoReadCount, resetPhotoReadCount } = await viteServer.ssrLoadModule('/src/data/photoStore.ts');
const { toCachedScan, mergeCloudScans } = await viteServer.ssrLoadModule('/src/data/scanCache.ts');
const { AppContext } = await viteServer.ssrLoadModule('/src/context/AppContextStore.ts');
const { AuthContext } = await viteServer.ssrLoadModule('/src/context/AuthContextStore.ts');
const { MemoryRouter, Route, Routes } = await viteServer.ssrLoadModule('/node_modules/react-router-dom/dist/index.mjs');
const { act, createElement, StrictMode, useCallback, useEffect, useRef, useState } = React;

const testInput = {
  image: new Blob(['mock crop photo'], { type: 'image/png' }),
  cropType: 'Cassava',
  observations: '',
  scanId: 'scan-ui-test',
  idToken: 'local-test-token',
};

const mockAssessment = {
  status: 'completed',
  cropIdentification: 'Cassava',
  observedSymptoms: ['Mock leaf discoloration'],
  possibleCauses: [{ name: 'Mock cause', explanation: 'Mock explanation.', likelihood: 'possible' }],
  confidence: 'moderate',
  confidenceReason: 'Mock confidence reason.',
  summary: 'Mock diagnosis displayed after a successful assessment.',
  recommendedActions: ['Inspect nearby leaves.'],
  preventionTips: ['Use clean tools.'],
  whenToSeekHelp: 'Contact an extension officer if symptoms spread.',
  limitations: ['This is a test fixture.'],
  disclaimer: 'Mock assessment only.',
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getProgress(host) {
  const progressbar = host.querySelector('[role="progressbar"]');
  assert.ok(progressbar, 'progress bar should be rendered');
  return Number(progressbar.getAttribute('aria-valuenow'));
}

async function click(host, selector) {
  await act(async () => {
    const button = host.querySelector(selector);
    assert.ok(button, `expected button ${selector}`);
    button.dispatchEvent(new browserWindow.MouseEvent('click', { bubbles: true }));
  });
}

function createMount(element) {
  const host = browserWindow.document.createElement('div');
  browserWindow.document.body.append(host);
  const root = createRoot(host);
  return {
    host,
    async render(nextElement = element) { await act(async () => root.render(nextElement)); },
    async unmount() {
      await act(async () => root.unmount());
      host.remove();
    },
  };
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

test('persisted scan metadata omits page-only previews while retaining the local photo reference', () => {
  const scan = Object.freeze({ id: 'scan-preview-cache', imageUrl: 'blob:selected-photo', photoStorageKey: 'owner/scan-preview-cache' });
  const cached = toCachedScan(scan);
  assert.equal(cached.imageUrl, '');
  assert.equal(cached.photoStorageKey, scan.photoStorageKey);
  assert.equal(scan.imageUrl, 'blob:selected-photo', 'saving metadata must not clear the live preview');
  assert.equal(toCachedScan({ ...scan, imageUrl: '/assets/saved-photo.png' }).imageUrl, '/assets/saved-photo.png');
});

test('server scan updates preserve the live photo while updating assessment and cloud references', () => {
  const selected = {
    id: 'scan-preview-merge', imageUrl: 'blob:selected-photo', photoStorageKey: 'owner/scan-preview-merge',
    dataScope: 'local-only', assessmentStatus: 'pending', firebasePhotoPath: 'old-firebase-reference',
  };
  const cloud = { id: selected.id, imageUrl: '', dataScope: 'cloud', assessmentStatus: 'processing' };
  const [processing] = mergeCloudScans([cloud], [selected], [toCachedScan(selected)]);
  assert.equal(processing.imageUrl, selected.imageUrl);
  assert.equal(processing.photoStorageKey, selected.photoStorageKey);
  assert.equal(processing.assessmentStatus, 'processing');
  assert.equal(processing.firebasePhotoPath, undefined, 'cleared cloud references must remain cleared');

  const cloudPhotoPath = `users/owner/scans/${selected.id}/photo`;
  const [completed] = mergeCloudScans([{
    ...cloud, assessmentStatus: 'completed', assessment: mockAssessment, summary: mockAssessment.summary,
    cloudPhotoPath, photoScope: 'cloud',
  }], [processing], [toCachedScan(selected)]);
  assert.equal(completed.imageUrl, selected.imageUrl);
  assert.equal(completed.assessment, mockAssessment);
  assert.equal(completed.summary, mockAssessment.summary);
  assert.equal(completed.assessmentStatus, 'completed');
  assert.equal(completed.cloudPhotoPath, cloudPhotoPath);
  assert.equal(completed.photoScope, 'cloud');

  const [cleared] = mergeCloudScans([{ ...cloud, photoScope: 'local-only' }], [completed], []);
  assert.equal(cleared.imageUrl, selected.imageUrl);
  assert.equal(cleared.cloudPhotoPath, undefined);
  assert.equal(cleared.photoScope, 'local-only');
});

test('a newly saved scan keeps its live photo when the server snapshot does not contain it yet', () => {
  const selected = { id: 'scan-not-on-server-yet', imageUrl: 'blob:new-photo', photoStorageKey: 'owner/new-photo', dataScope: 'local-only' };
  const cachedCloudScan = { id: 'removed-cloud-scan', imageUrl: '', dataScope: 'cloud' };
  const merged = mergeCloudScans([], [selected], [toCachedScan(selected), cachedCloudScan]);
  assert.deepEqual(merged, [selected]);
});

test('result photo reuses the selected preview without rereading or downloading it', async () => {
  const previewUrl = URL.createObjectURL(testInput.image);
  const originalFetch = globalThis.fetch;
  const originalRevoke = URL.revokeObjectURL;
  const revokedUrls = [];
  let fetchCalls = 0;
  const scan = {
    id: 'scan-reused-preview',
    imageUrl: previewUrl,
    photoStorageKey: 'scan-reused-preview',
    cloudPhotoPath: 'users/owner/scans/scan-reused-preview/photo',
  };
  const user = { uid: 'owner', async getIdToken() { return 'test-token'; } };
  const renderPhoto = (photoScan) => createElement(StrictMode, null,
    createElement(AuthContext.Provider, { value: { user } },
      createElement(ScanImage, { scan: photoScan, alt: 'Selected crop photo' })));
  await saveScanPhoto(scan.photoStorageKey, testInput.image);
  resetPhotoReadCount();
  globalThis.fetch = async () => { fetchCalls += 1; throw new Error('Preview must not be downloaded.'); };
  URL.revokeObjectURL = (url) => { revokedUrls.push(url); originalRevoke(url); };
  const mount = createMount(renderPhoto(scan));
  try {
    await mount.render();
    assert.equal(mount.host.querySelector('img')?.getAttribute('src'), previewUrl);
    assert.equal(photoReadCount(), 0);
    assert.equal(fetchCalls, 0);

    await mount.render(renderPhoto({ ...scan, cloudPhotoPath: 'users/owner/scans/scan-reused-preview/updated-photo' }));
    assert.equal(mount.host.querySelector('img')?.getAttribute('src'), previewUrl,
      'cloud sync metadata must not replace the already selected photo');
    assert.equal(photoReadCount(), 0);
    assert.equal(fetchCalls, 0);
  } finally {
    await mount.unmount();
    URL.revokeObjectURL = originalRevoke;
    globalThis.fetch = originalFetch;
    originalRevoke(previewUrl);
  }
  assert.equal(revokedUrls.includes(previewUrl), false, 'the photo component does not own the selected preview URL');
});

test('saved history can load its local photo when the original preview is no longer available', async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  const scan = {
    id: 'scan-saved-local-photo',
    imageUrl: '',
    photoStorageKey: 'scan-saved-local-photo',
    cloudPhotoPath: 'users/owner/scans/scan-saved-local-photo/photo',
  };
  await saveScanPhoto(scan.photoStorageKey, testInput.image);
  resetPhotoReadCount();
  globalThis.fetch = async () => { fetchCalls += 1; throw new Error('A saved local photo should not be downloaded.'); };
  const mount = createMount(createElement(AuthContext.Provider,
    { value: { user: { uid: 'owner', async getIdToken() { return 'test-token'; } } } },
    createElement(ScanImage, { scan, alt: 'Saved crop photo' })));
  try {
    await mount.render();
    assert.match(mount.host.querySelector('img')?.getAttribute('src') ?? '', /^blob:/);
    assert.equal(photoReadCount(), 1);
    assert.equal(fetchCalls, 0);
  } finally {
    await mount.unmount();
    globalThis.fetch = originalFetch;
  }
});

function ScanningFlowFixture({ fixture, onAssessment, onPhotoSynced, onFailure }) {
  const [scans, setScans] = useState([]);
  const [scanDraft, setScanDraft] = useState(fixture.scanDraft);
  const resetScanDraft = useCallback(() => setScanDraft({ photoFile: null, photoPreviewUrl: null, photoSizeMb: 0, cropType: null, customCropName: '', observations: '' }), []);
  const createScanFromDraft = useCallback(() => fixture.scan, [fixture]);
  const saveScan = useCallback(async (scan) => {
    setScans([scan]);
    return 'local-only';
  }, []);
  const applyAssessment = useCallback((scanId, assessment, status, summary) => {
    onAssessment();
    setScans((previous) => previous.map((scan) => scan.id === scanId
      ? { ...scan, assessment, assessmentStatus: status, summary }
      : scan));
  }, [onAssessment]);
  const markPhotoSynced = useCallback((scanId, cloudPhotoPath) => {
    onPhotoSynced(cloudPhotoPath);
    setScans((previous) => previous.map((scan) => scan.id === scanId
      ? { ...scan, cloudPhotoPath, photoScope: 'cloud' }
      : scan));
  }, [onPhotoSynced]);
  const markScanFailed = useCallback(async () => { onFailure(); }, [onFailure]);
  const appContext = {
    scans,
    scanDraft,
    createScanFromDraft,
    saveScan,
    applyAssessment,
    markPhotoSynced,
    markScanFailed,
    resetScanDraft,
    setHelpModalOpen() {},
  };
  return createElement(AppContext.Provider, { value: appContext },
    createElement(AuthContext.Provider, { value: fixture.auth },
      createElement(Routes, null,
        createElement(Route, { path: '/scanning', element: createElement(ScanningScreen) }),
        createElement(Route, { path: '/assessment/:id', element: createElement(CropAssessmentScreen) }))));
}

for (const uploadOutcome of ['success', 'failure']) {
  test(`scanning shows the completed result while photo upload is pending, then handles upload ${uploadOutcome}`, { timeout: 5_000 }, async () => {
    const photoUpload = deferred();
    const uploadStarted = deferred();
    const originalFetch = globalThis.fetch;
    const calls = { assessmentRequests: 0, photoRequests: 0, assessments: 0, synced: 0, failures: 0 };
    const scanId = `scan-photo-upload-${uploadOutcome}`;
    const previewUrl = URL.createObjectURL(testInput.image);
    resetPhotoReadCount();
    const fixture = {
      scan: {
        id: scanId,
        cropType: 'Cassava',
        title: 'Cassava crop check',
        date: 'Today',
        imageUrl: previewUrl,
        photoStorageKey: scanId,
        photoScope: 'local-only',
        assessmentStatus: 'pending',
      },
      scanDraft: {
        photoFile: testInput.image,
        photoPreviewUrl: previewUrl,
        photoSizeMb: 0.001,
        cropType: 'Cassava',
        customCropName: '',
        observations: '',
      },
      auth: {
        user: { uid: 'scan-ui-user', async getIdToken() { return 'local-test-token'; } },
        fullName: '', loading: false, configured: true,
      },
    };
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (url.endsWith('/api/analyze-crop')) {
        calls.assessmentRequests += 1;
        return Response.json({ assessment: mockAssessment });
      }
      if (url.endsWith(`/api/scans/${scanId}/photo`) && init?.method === 'POST') {
        calls.photoRequests += 1;
        uploadStarted.resolve();
        return photoUpload.promise;
      }
      throw new Error(`Unexpected request: ${url}`);
    };
    const mount = createMount(createElement(StrictMode, null,
      createElement(MemoryRouter, { initialEntries: ['/scanning'] },
        createElement(ScanningFlowFixture, {
          fixture,
          onAssessment() { calls.assessments += 1; },
          onPhotoSynced(path) { calls.synced += 1; calls.syncedPath = path; },
          onFailure() { calls.failures += 1; },
        }))));
    try {
      await mount.render();
      await act(async () => {
        await uploadStarted.promise;
        await delay(20);
      });
      assert.match(mount.host.textContent, /Mock diagnosis displayed after a successful assessment/,
        'a separate pending photo upload must not delay the assessment result');
      assert.doesNotMatch(mount.host.textContent, /Analyzing Crop/);
      assert.equal(calls.assessmentRequests, 1);
      assert.equal(calls.photoRequests, 1);
      assert.equal(calls.assessments, 1);
      assert.equal(calls.failures, 0);
      assert.equal(calls.synced, 0);
      assert.equal(mount.host.querySelector('img[alt="Cassava scan"]')?.getAttribute('src'), previewUrl);
      assert.equal(photoReadCount(), 1, 'only the assessment request needs to read the saved photo');

      await act(async () => {
        photoUpload.resolve(uploadOutcome === 'success'
          ? Response.json({ cloudPhotoPath: `users/scan-ui-user/scans/${scanId}/photo` })
          : new Response('Photo storage unavailable', { status: 503 }));
        await delay(20);
      });
      assert.match(mount.host.textContent, /Mock diagnosis displayed after a successful assessment/);
      assert.equal(calls.failures, 0, 'photo sync failure must not fail a completed assessment');
      assert.equal(calls.synced, uploadOutcome === 'success' ? 1 : 0);
      assert.equal(calls.syncedPath, uploadOutcome === 'success'
        ? `users/scan-ui-user/scans/${scanId}/photo` : undefined);
      assert.equal(calls.assessmentRequests, 1);
      assert.equal(mount.host.querySelector('img[alt="Cassava scan"]')?.getAttribute('src'), previewUrl);
      assert.equal(photoReadCount(), 1, 'background sync must not reread the displayed photo');
    } finally {
      photoUpload.resolve(new Response(null, { status: 503 }));
      await mount.unmount();
      globalThis.fetch = originalFetch;
      URL.revokeObjectURL(previewUrl);
    }
  });
}

function AssessmentHarness({ fetcher, operationRef, onCompleteStarted, prepare }) {
  const {
    progress: progressValue,
    message: progressMessage,
    start: startProgress,
    setPhase: setProgressPhase,
    stop: stopProgress,
    complete: completeProgress,
  } = useAssessmentProgress();
  const inFlight = useRef(false);
  const [requestCount, setRequestCount] = useState(0);
  const [error, setError] = useState('');
  const [diagnosis, setDiagnosis] = useState('');

  const submit = async () => {
    if (inFlight.current) return;
    // The request guard is intentionally mutable so same-tick repeat taps cannot race state updates.
    // oxlint-disable-next-line react/immutability
    inFlight.current = true;
    startProgress();
    setError('');
    setDiagnosis('');
    setRequestCount((count) => count + 1);
    try {
      await prepare?.();
      setProgressPhase('uploading');
      const result = await requestCropAssessment(testInput, fetcher);
      const completion = completeProgress();
      onCompleteStarted?.();
      await completion;
      setDiagnosis(result.summary);
    } catch (reason) {
      stopProgress();
      setError(reason instanceof Error ? reason.message : 'Mock assessment failed.');
    } finally {
      inFlight.current = false;
    }
  };

  const handleClick = () => {
    // This event handler reads the synchronous guard so repeated clicks cannot race React state.
    // oxlint-disable-next-line react/refs
    if (inFlight.current) return;
    const operation = submit();
    if (operationRef) operationRef.current = operation;
  };

  return createElement('main', null,
    createElement(AssessmentProgressIndicator, { progress: progressValue, message: progressMessage }),
    // oxlint-disable-next-line react/refs -- React invokes this handler on click, not during render.
    createElement('button', {
      type: 'button',
      'data-action': 'submit',
      onClick: handleClick,
    }, 'Scan / Retry'),
    createElement('span', { 'data-request-count': true }, String(requestCount)),
    createElement('p', { role: 'alert' }, error),
    createElement('p', { 'data-diagnosis': true }, diagnosis),
  );
}

function StrictModeHarness({ fetcher }) {
  const {
    progress: progressValue,
    message: progressMessage,
    resume: resumeProgress,
    start: startProgress,
    setPhase: setProgressPhase,
    stop: stopProgress,
    complete: completeProgress,
  } = useAssessmentProgress();
  const scanProcess = useRef(null);
  const [requestCount, setRequestCount] = useState(0);

  useEffect(() => {
    resumeProgress();
    if (!scanProcess.current) {
      startProgress();
      setProgressPhase('uploading');
      setRequestCount((count) => count + 1);
      // Cache the in-flight operation across Strict Mode effect replay to model the scanner lifecycle.
      // oxlint-disable-next-line react/immutability
      scanProcess.current = requestCropAssessment(testInput, fetcher)
        .then(async () => { await completeProgress(); })
        .catch(() => { stopProgress(); });
    }
  }, [completeProgress, fetcher, resumeProgress, setProgressPhase, startProgress, stopProgress]);

  return createElement('main', null,
    createElement(AssessmentProgressIndicator, { progress: progressValue, message: progressMessage }),
    createElement('span', { 'data-request-count': true }, String(requestCount)),
  );
}

function requestCount(host) {
  return Number(host.querySelector('[data-request-count]')?.textContent ?? 0);
}

test('mounted indicator shows progress stages and only completes after a validated mock response', async () => {
  let resolveResponse;
  let resolveCompletionStarted;
  const completionStarted = new Promise((resolve) => { resolveCompletionStarted = resolve; });
  const preparation = deferred();
  const uploadStarted = deferred();
  const operationRef = { current: null };
  let fetchCalls = 0;
  const fetcher = async () => {
    fetchCalls += 1;
    uploadStarted.resolve();
    return await new Promise((resolve) => { resolveResponse = resolve; });
  };
  const mount = createMount(createElement(AssessmentHarness, {
    fetcher,
    operationRef,
    prepare: () => preparation.promise,
    onCompleteStarted: () => resolveCompletionStarted(),
  }));
  try {
    await mount.render();
    assert.equal(getProgress(mount.host), 0);
    assert.match(mount.host.textContent ?? '', /Preparing your crop image/);

    await act(async () => {
      const button = mount.host.querySelector('[data-action="submit"]');
      assert.ok(button);
      button.dispatchEvent(new browserWindow.MouseEvent('click', { bubbles: true }));
      button.dispatchEvent(new browserWindow.MouseEvent('click', { bubbles: true }));
    });
    assert.equal(fetchCalls, 0, 'the request must wait until preparation completes');
    assert.match(mount.host.textContent ?? '', /Preparing your crop image/);
    const operation = operationRef.current;

    await act(async () => {
      preparation.resolve();
      await uploadStarted.promise;
    });
    assert.match(mount.host.textContent ?? '', /Uploading crop image/);
    assert.equal(fetchCalls, 1, 'rapid repeat clicks must submit only one request');

    await act(async () => delay(2_100));
    assert.match(mount.host.textContent ?? '', /AI is examining your crop/);
    assert.ok(getProgress(mount.host) > 0);
    assert.ok(getProgress(mount.host) <= 94);

    assert.ok(resolveResponse);
    await act(async () => {
      resolveResponse(Response.json({ assessment: mockAssessment }));
      await completionStarted;
    });
    assert.equal(getProgress(mount.host), 100);
    assert.match(mount.host.textContent ?? '', /Analysis complete/);
    assert.equal(mount.host.querySelector('[data-diagnosis]')?.textContent, '', 'diagnosis should wait through the completion message');

    await act(async () => operationRef.current && await operation);
    assert.match(mount.host.textContent ?? '', /Mock diagnosis displayed/);
    assert.equal(requestCount(mount.host), 1);
  } finally {
    await mount.unmount();
  }
});

test('mounted failures stop below 100 for timeout, quota, unavailability, gateway, and malformed responses', async () => {
  const scenarios = [
    { name: 'timeout', response: () => Response.json({ error: { code: 'GEMINI_TIMEOUT', message: 'Timed out mock.', retryable: true } }, { status: 504 }), message: /Timed out mock/ },
    { name: '429', response: () => Response.json({ error: { code: 'GEMINI_QUOTA', message: 'Quota mock.', retryable: true } }, { status: 429 }), message: /Quota mock/ },
    { name: '503', response: () => Response.json({ error: { code: 'GEMINI_UNAVAILABLE', message: 'Unavailable mock.', retryable: true } }, { status: 503 }), message: /Unavailable mock/ },
    { name: '504', response: () => new Response('untrusted mock body', { status: 504 }), message: /took too long/i },
    { name: 'malformed', response: () => Response.json({ assessment: { summary: 'incomplete' } }), message: /could not be checked|incomplete/i },
  ];

  for (const scenario of scenarios) {
    let calls = 0;
    const operationRef = { current: null };
    const fetcher = async () => {
      calls += 1;
      await delay(350);
      return scenario.response();
    };
    const mount = createMount(createElement(AssessmentHarness, { fetcher, operationRef }));
    try {
      await mount.render();
      await click(mount.host, '[data-action="submit"]');
      await act(async () => await operationRef.current);
      const stoppedAt = getProgress(mount.host);
      assert.ok(stoppedAt < 100, `${scenario.name} must not complete the progress bar`);
      assert.match(mount.host.querySelector('[role="alert"]')?.textContent ?? '', scenario.message);
      await act(async () => delay(300));
      assert.equal(getProgress(mount.host), stoppedAt, `${scenario.name} must stop progress updates after failure`);
      assert.equal(calls, 1);
    } finally {
      await mount.unmount();
    }
  }
});

test('mounted retry resets progress and clears the previous error before one new request', async () => {
  const responses = [
    Response.json({ error: { code: 'GEMINI_QUOTA', message: 'Quota mock.', retryable: true } }, { status: 429 }),
    Response.json({ assessment: mockAssessment }),
  ];
  let calls = 0;
  const operationRef = { current: null };
  const fetcher = async () => {
    const response = responses[calls];
    calls += 1;
    await delay(calls === 1 ? 600 : 100);
    assert.ok(response);
    return response;
  };
  const mount = createMount(createElement(AssessmentHarness, { fetcher, operationRef }));
  try {
    await mount.render();
    await click(mount.host, '[data-action="submit"]');
    await act(async () => await operationRef.current);
    assert.ok(getProgress(mount.host) > 0);
    assert.equal(calls, 1);

    await click(mount.host, '[data-action="submit"]');
    const retryOperation = operationRef.current;
    assert.equal(getProgress(mount.host), 0, 'retry must start from zero');
    assert.equal(mount.host.querySelector('[role="alert"]')?.textContent, '', 'retry must clear the previous error');
    assert.equal(calls, 2, 'one deliberate retry must make one request');
    await act(async () => await retryOperation);
    assert.match(mount.host.textContent ?? '', /Analysis complete/);
    assert.match(mount.host.textContent ?? '', /Mock diagnosis displayed/);
  } finally {
    await mount.unmount();
  }
});

test('Strict Mode effect replay resumes progress without duplicating the mocked assessment request', async () => {
  let calls = 0;
  const fetcher = async () => {
    calls += 1;
    await delay(2_300);
    return Response.json({ assessment: mockAssessment });
  };
  const mount = createMount(createElement(StrictMode, null, createElement(StrictModeHarness, { fetcher })));
  try {
    await mount.render();
    await act(async () => delay(700));
    assert.equal(calls, 1);
    assert.equal(requestCount(mount.host), 1);
    assert.ok(getProgress(mount.host) > 0, 'progress timer should resume after Strict Mode replays effects');
    assert.ok(getProgress(mount.host) < 100);
  } finally {
    await mount.unmount();
  }
});

test('unmounting clears the progress interval', async () => {
  const originalSetInterval = globalThis.setInterval;
  const originalClearInterval = globalThis.clearInterval;
  const activeIntervals = new Set();
  globalThis.setInterval = (handler, timeout, ...args) => {
    const interval = originalSetInterval(handler, timeout, ...args);
    activeIntervals.add(interval);
    return interval;
  };
  globalThis.clearInterval = (interval) => {
    if (interval !== undefined) activeIntervals.delete(interval);
    return originalClearInterval(interval);
  };

  const pendingResponse = deferred();
  const operationRef = { current: null };
  const fetcher = async () => await pendingResponse.promise;
  const mount = createMount(createElement(AssessmentHarness, { fetcher, operationRef }));
  try {
    await mount.render();
    await click(mount.host, '[data-action="submit"]');
    assert.equal(activeIntervals.size, 1);
    await mount.unmount();
    assert.equal(activeIntervals.size, 0);
  } finally {
    globalThis.setInterval = originalSetInterval;
    globalThis.clearInterval = originalClearInterval;
    if (mount.host.isConnected) await mount.unmount();
    // Finish the mock request so the real API deadline timer is released.
    pendingResponse.resolve(Response.json({ error: { code: 'ASSESSMENT_UNAVAILABLE', message: 'Unmount fixture finished.' } }, { status: 503 }));
    await operationRef.current;
  }
});

test('Farm Guide selects an area, prepares its plan, and opens crop planting notes', async () => {
  const appContext = { setHelpModalOpen() {}, scans: [] };
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => { fetchCalls += 1; throw new Error('Farm Guide must not call a service'); };
  const mount = createMount(createElement(MemoryRouter, { initialEntries: ['/farm-guide'] },
    createElement(AppContext.Provider, { value: appContext },
      createElement(Routes, null,
        createElement(Route, { path: '/farm-guide', element: createElement(SeasonSenseScreen) }),
        createElement(Route, { path: '/farm-guide/plan', element: createElement(FarmGuidePlanScreen) }),
      ))));
  try {
    await mount.render();
    const selects = mount.host.querySelectorAll('select');
    assert.equal(selects.length, 2);
    assert.equal(selects[1].disabled, true);
    const state = [...selects[0].options].find((option) => option.textContent === 'Akwa Ibom');
    assert.ok(state);
    await act(async () => {
      selects[0].value = state.value;
      selects[0].dispatchEvent(new browserWindow.Event('change', { bubbles: true }));
    });
    const eket = [...selects[1].options].find((option) => option.textContent === 'Eket');
    assert.ok(eket);
    await act(async () => {
      selects[1].value = eket.value;
      selects[1].dispatchEvent(new browserWindow.Event('change', { bubbles: true }));
    });
    assert.match(mount.host.textContent, /Estimated farming zone/);
    assert.match(mount.host.textContent, /Mangrove \/ Freshwater Swamp/);
    const seePlan = [...mount.host.querySelectorAll('button')].find((button) => button.textContent.trim() === 'See plan');
    assert.ok(seePlan);
    assert.equal(seePlan.disabled, false);
    await act(async () => { seePlan.dispatchEvent(new browserWindow.MouseEvent('click', { bubbles: true })); });
    assert.match(mount.host.textContent, /Putting your farm plan together/);
    assert.doesNotMatch(mount.host.textContent, /Plant this month/);
    await act(async () => delay(6_000));
    assert.match(mount.host.textContent, /Eket, Akwa Ibom/);
    assert.match(mount.host.textContent, /Mangrove \/ Freshwater Swamp/);
    assert.match(mount.host.textContent, /Crop calendar/);
    assert.match(mount.host.textContent, /Plant this month/);
    assert.doesNotMatch(mount.host.textContent, /Draft/);
    assert.doesNotMatch(mount.host.textContent, /not a live weather forecast/i);
    const cassavaCard = [...mount.host.querySelectorAll('button')].find((button) => button.textContent.includes('Cassava'));
    assert.ok(cassavaCard);
    assert.equal(cassavaCard.querySelector('img')?.getAttribute('src'), '/assets/thumb-cassava.png');
    await act(async () => { cassavaCard.dispatchEvent(new browserWindow.MouseEvent('click', { bubbles: true })); });
    assert.match(mount.host.textContent, /How to plant/);
    assert.match(mount.host.textContent, /stem cuttings/i);
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
    await mount.unmount();
  }
});

test('sample result appears only for a matching failed scan and is not saved as an assessment', async () => {
  const scan = {
    id: 'scan-sample-test',
    cropType: 'Cassava',
    assessmentStatus: 'failed',
    assessmentFailure: { code: 'GEMINI_TIMEOUT', status: 504 },
  };
  const appContext = { setHelpModalOpen() {}, scans: [scan] };
  const state = { scanId: scan.id, source: 'assessment', cropType: scan.cropType, failure: scan.assessmentFailure };
  const mount = createMount(createElement(MemoryRouter, { initialEntries: [{ pathname: '/sample-result', state }] },
    createElement(AppContext.Provider, { value: appContext },
      createElement(SampleCropResultScreen))));
  try {
    await mount.render();
    assert.match(mount.host.textContent, /Sample result/);
    assert.match(mount.host.textContent, /Sample result — this was not checked from your photo\./i);
    assert.match(mount.host.textContent, /Dry, brown edges on cassava leaves/);
    assert.equal(scan.assessment, undefined);
  } finally {
    await mount.unmount();
  }
});

test('provider failure offers an explicit sample choice and the sample is not shown until selected', async () => {
  const scan = {
    id: 'scan-fallback-test',
    cropType: 'Cassava',
    assessmentStatus: 'failed',
    assessmentFailure: { code: 'GEMINI_TIMEOUT', status: 504 },
    summary: 'The crop check took too long. Your scan is saved. Try again later.',
    imageUrl: '',
    photoScope: 'local-only',
  };
  const appContext = {
    setHelpModalOpen() {}, scans: [scan], resetScanDraft() {},
    applyAssessment() {}, async markScanFailed() {},
  };
  const authContext = { user: null, fullName: '', loading: false, configured: false };
  const mount = createMount(createElement(MemoryRouter, { initialEntries: [`/assessment/${scan.id}`] },
    createElement(AppContext.Provider, { value: appContext },
      createElement(AuthContext.Provider, { value: authContext },
        createElement(Routes, null,
          createElement(Route, { path: '/assessment/:id', element: createElement(CropAssessmentScreen) }),
          createElement(Route, { path: '/sample-result', element: createElement(SampleCropResultScreen) }),
          createElement(Route, { path: '/', element: createElement('p', { 'data-home': true }, 'FarmPal home') }),
        )))));
  try {
    await mount.render();
    assert.match(mount.host.textContent, /Crop check is unavailable right now\./);
    assert.match(mount.host.textContent, /We can show you an example result while you wait\./);
    assert.doesNotMatch(mount.host.textContent, /Dry, brown edges on cassava leaves/);
    assert.equal([...mount.host.querySelectorAll('button')].some((button) => button.textContent.trim() === 'Try again'), false,
      'without a signed-in user and saved photo, samples remain an explicit choice while assessment retry is unavailable');

    const viewSample = [...mount.host.querySelectorAll('button')].find((button) => button.textContent.trim() === 'View sample result');
    assert.ok(viewSample);
    await act(async () => viewSample.dispatchEvent(new browserWindow.MouseEvent('click', { bubbles: true })));
    assert.match(mount.host.textContent, /Sample result — this was not checked from your photo\./i);
    assert.match(mount.host.textContent, /Dry, brown edges on cassava leaves/);
    assert.equal(scan.assessment, undefined, 'opening a sample must not write an assessment to the scan');

    const backToScan = [...mount.host.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Back to your scan');
    assert.ok(backToScan);
    await act(async () => backToScan.dispatchEvent(new browserWindow.MouseEvent('click', { bubbles: true })));
    const later = [...mount.host.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Try again later');
    assert.ok(later);
    await act(async () => later.dispatchEvent(new browserWindow.MouseEvent('click', { bubbles: true })));
    assert.match(mount.host.querySelector('[data-home]')?.textContent ?? '', /FarmPal home/);
    assert.equal(scan.assessment, undefined);
  } finally {
    await mount.unmount();
  }
});

test('a successful mocked scan result remains visible as a real assessment', async () => {
  const scan = {
    id: 'scan-real-result-test',
    cropType: 'Cassava',
    assessmentStatus: 'completed',
    assessment: mockAssessment,
    summary: mockAssessment.summary,
    imageUrl: '',
    photoScope: 'local-only',
  };
  const appContext = { setHelpModalOpen() {}, scans: [scan], resetScanDraft() {}, applyAssessment() {}, async markScanFailed() {} };
  const authContext = { user: null, fullName: '', loading: false, configured: false };
  const mount = createMount(createElement(MemoryRouter, { initialEntries: [`/assessment/${scan.id}`] },
    createElement(AppContext.Provider, { value: appContext },
      createElement(AuthContext.Provider, { value: authContext },
        createElement(Routes, null,
          createElement(Route, { path: '/assessment/:id', element: createElement(CropAssessmentScreen) }),
        )))));
  try {
    await mount.render();
    assert.match(mount.host.textContent, /Mock diagnosis displayed after a successful assessment/);
    assert.match(mount.host.textContent, /Mock leaf discoloration/);
    assert.doesNotMatch(mount.host.textContent, /Sample result — this was not checked from your photo/);
  } finally {
    await mount.unmount();
  }
});

after(async () => {
  await browserWindow.happyDOM.abort();
  await viteServer.close();
});
