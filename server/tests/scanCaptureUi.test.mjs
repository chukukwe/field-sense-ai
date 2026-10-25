import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';

const browserWindow = new Window({ url: 'http://localhost/' });
for (const [name, value] of Object.entries({ window: browserWindow, document: browserWindow.document, navigator: browserWindow.navigator, HTMLElement: browserWindow.HTMLElement, Node: browserWindow.Node, Event: browserWindow.Event, MouseEvent: browserWindow.MouseEvent, IS_REACT_ACT_ENVIRONMENT: true })) {
  Object.defineProperty(globalThis, name, { configurable: true, value, writable: true });
}
const server = await createServer({
  configFile: false, root: fileURLToPath(new URL('../../', import.meta.url)), appType: 'custom',
  plugins: [{ name: 'scan-capture-fixtures', load(id) {
    const path = id.replaceAll('\\', '/');
    if (path.endsWith('/src/data/photoStore.ts')) return `const photos = new Map();
      export async function saveScanPhoto(key, image) { photos.set(key, image); }
      export async function getScanPhoto(key) { return photos.get(key); }
      export async function deleteScanPhoto(key) { photos.delete(key); }`;
    if (path.endsWith('/src/data/assessmentApi.ts')) return `export class AssessmentRequestError extends Error {}
      export async function requestCropAssessment(input) { return globalThis.scanCaptureFixture.request(input); }`;
    if (path.endsWith('/src/data/photoApi.ts')) return `export async function uploadCropPhoto() { return 'users/owner/scans/scan-test/photo'; }`;
    return null;
  } }, react()], server: { middlewareMode: true, hmr: false, ws: false },
});
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { ScanScreen } = await server.ssrLoadModule('/src/pages/ScanScreen.tsx');
const { ScanningScreen } = await server.ssrLoadModule('/src/pages/ScanningScreen.tsx');
const { AppContext } = await server.ssrLoadModule('/src/context/AppContextStore.ts');
const { AuthContext } = await server.ssrLoadModule('/src/context/AuthContextStore.ts');
const { MemoryRouter, Route, Routes, useNavigate } = await server.ssrLoadModule('/node_modules/react-router-dom/dist/index.mjs');
const { act, createElement: h, StrictMode, useState } = React;
const emptyDraft = { photoFile: null, photoPreviewUrl: null, photoSizeMb: 0, cropType: null, customCropName: '', observations: '' };
const assessment = { status: 'completed', summary: 'Test assessment only' };
const user = { uid: 'owner', async getIdToken() { return 'test-token'; } };

function deferred() { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; }
function button(host, text) { const found = [...host.querySelectorAll('button')].find((item) => item.textContent.trim() === text); assert.ok(found, `Missing button ${text}`); return found; }
async function click(element) { await act(async () => element.dispatchEvent(new browserWindow.MouseEvent('click', { bubbles: true }))); }
function Fixture({ initialDraft = emptyDraft, path = '/scan', counters = {} }) {
  const [draft, setDraft] = useState(initialDraft);
  const [scans, setScans] = useState([]);
  const context = {
    scans, scanDraft: draft, setScanDraft: setDraft, setHelpModalOpen() {},
    resetScanDraft() { counters.reset = (counters.reset ?? 0) + 1; setDraft(emptyDraft); },
    createScanFromDraft() { counters.created = (counters.created ?? 0) + 1; return { id: 'scan-test', photoStorageKey: 'owner/scan-test', imageUrl: draft.photoPreviewUrl, cropType: draft.cropType }; },
    async saveScan(scan) { counters.saved = (counters.saved ?? 0) + 1; setScans([scan]); return 'local-only'; },
    applyAssessment() { counters.assessed = (counters.assessed ?? 0) + 1; },
    markPhotoSynced() {}, async markScanFailed() { counters.failed = (counters.failed ?? 0) + 1; },
  };
  function Result() { const navigate = useNavigate(); return h('div', null, 'Assessment result', h('button', { onClick: () => navigate(-1) }, 'Back'), h('button', { onClick: () => navigate('/scanning') }, 'Revisit scanning')); }
  return h(AuthContext.Provider, { value: { user } }, h(AppContext.Provider, { value: context },
    h(MemoryRouter, { initialEntries: ['/', path], initialIndex: 1 }, h(Routes, null,
      h(Route, { path: '/', element: h('p', null, 'Home') }),
      h(Route, { path: '/scan', element: h(ScanScreen) }),
      h(Route, { path: '/scanning', element: h(ScanningScreen) }),
      h(Route, { path: '/assessment/:id', element: h(Result) })))));
}
async function mount(element) {
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host);
  await act(async () => root.render(h(StrictMode, null, element)));
  return { host, async unmount() { await act(async () => root.unmount()); host.remove(); } };
}
async function selectFile(host, file) {
  const input = host.querySelector('input[type="file"]');
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  await act(async () => input.dispatchEvent(new browserWindow.Event('change', { bubbles: true })));
}

test('opening the processing route with no draft returns to capture without creating a scan', async () => {
  const counters = {};
  const mounted = await mount(h(Fixture, { path: '/scanning', counters }));
  try { assert.match(mounted.host.textContent, /Check a crop/); assert.equal(counters.created ?? 0, 0); assert.equal(counters.saved ?? 0, 0); }
  finally { await mounted.unmount(); }
});

test('submitting consumes the draft once in Strict Mode and returning cannot create a duplicate', async () => {
  const response = deferred(); let requests = 0; let requestInput;
  globalThis.scanCaptureFixture = { async request(input) { requests++; requestInput = input; return response.promise; } };
  const file = new File(['test fixture image'], 'leaf.jpg', { type: 'image/jpeg' });
  const initialDraft = { ...emptyDraft, photoFile: file, photoPreviewUrl: URL.createObjectURL(file), cropType: 'Other', customCropName: 'Okra', observations: 'Leaves yellowing' };
  const counters = {};
  const mounted = await mount(h(Fixture, { path: '/scanning', initialDraft, counters }));
  try {
    assert.equal(counters.created, 1); assert.equal(counters.reset, 1); assert.equal(counters.saved, 1); assert.equal(requests, 1);
    assert.match(mounted.host.textContent, /Okra/); assert.doesNotMatch(mounted.host.textContent, /Akpu/);
    assert.equal(requestInput.cropType, 'Other'); assert.equal(requestInput.customCropName, 'Okra'); assert.equal(requestInput.observations, 'Leaves yellowing');
    await act(async () => { response.resolve(assessment); await new Promise((done) => setTimeout(done, 500)); });
    assert.match(mounted.host.textContent, /Assessment result/);
    await click(button(mounted.host, 'Revisit scanning'));
    assert.match(mounted.host.textContent, /Check a crop/); assert.equal(counters.created, 1); assert.equal(requests, 1);
  } finally { await mounted.unmount(); URL.revokeObjectURL(initialDraft.photoPreviewUrl); }
});

test('returning from a completed result skips the processing route', async () => {
  globalThis.scanCaptureFixture = { async request() { return assessment; } };
  const file = new File(['fixture image'], 'leaf.jpg', { type: 'image/jpeg' });
  const initialDraft = { ...emptyDraft, photoFile: file, photoPreviewUrl: URL.createObjectURL(file), cropType: 'Maize' };
  const counters = {};
  const mounted = await mount(h(Fixture, { path: '/scanning', initialDraft, counters }));
  try {
    await act(async () => new Promise((done) => setTimeout(done, 500)));
    assert.match(mounted.host.textContent, /Assessment result/);
    await click(button(mounted.host, 'Back'));
    assert.equal(mounted.host.textContent, 'Home'); assert.equal(counters.created, 1);
  } finally { await mounted.unmount(); URL.revokeObjectURL(initialDraft.photoPreviewUrl); }
});

test('camera denial offers the gallery fallback without creating a scan', async () => {
  const original = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { async getUserMedia() { throw new Error('NotAllowedError'); } } });
  const counters = {}; const mounted = await mount(h(Fixture, { counters }));
  try {
    await click(button(mounted.host, 'Take Photo'));
    assert.match(mounted.host.textContent, /Camera not available/);
    assert.ok(button(mounted.host, 'Choose Photo from Gallery / Files'));
    assert.equal(counters.created ?? 0, 0);
  } finally { await mounted.unmount(); if (original) Object.defineProperty(navigator, 'mediaDevices', original); else delete navigator.mediaDevices; }
});

test('camera requests cannot be duplicated and a stream arriving after leaving is stopped', async () => {
  const camera = deferred(); let requests = 0; let stopped = 0;
  const original = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia() { requests++; return camera.promise; } } });
  const mounted = await mount(h(Fixture));
  try {
    const trigger = button(mounted.host, 'Take Photo');
    await click(trigger); await click(trigger); assert.equal(requests, 1);
    await mounted.unmount();
    await act(async () => camera.resolve({ getTracks() { return [{ stop() { stopped++; } }]; } }));
    assert.equal(stopped, 1);
  } finally { if (mounted.host.isConnected) await mounted.unmount(); if (original) Object.defineProperty(navigator, 'mediaDevices', original); else delete navigator.mediaDevices; }
});

test('cancelling the camera discards an in-flight canvas capture', async () => {
  const deviceDescriptor = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
  const videoPrototype = browserWindow.HTMLVideoElement.prototype;
  const canvasPrototype = browserWindow.HTMLCanvasElement.prototype;
  const playDescriptor = Object.getOwnPropertyDescriptor(videoPrototype, 'play');
  const sourceDescriptor = Object.getOwnPropertyDescriptor(videoPrototype, 'srcObject');
  const contextDescriptor = Object.getOwnPropertyDescriptor(canvasPrototype, 'getContext');
  const blobDescriptor = Object.getOwnPropertyDescriptor(canvasPrototype, 'toBlob');
  let finishCapture; let stopped = 0;
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { async getUserMedia() { return { getTracks() { return [{ stop() { stopped++; } }]; } }; } } });
  Object.defineProperty(videoPrototype, 'play', { configurable: true, value: async () => {} });
  Object.defineProperty(videoPrototype, 'srcObject', { configurable: true, writable: true, value: null });
  Object.defineProperty(canvasPrototype, 'getContext', { configurable: true, value: () => ({ drawImage() {} }) });
  Object.defineProperty(canvasPrototype, 'toBlob', { configurable: true, value(callback) { finishCapture = callback; } });
  const mounted = await mount(h(Fixture));
  try {
    await click(button(mounted.host, 'Take Photo'));
    const video = mounted.host.querySelector('video'); assert.ok(video);
    Object.defineProperty(video, 'videoWidth', { configurable: true, value: 20 });
    Object.defineProperty(video, 'videoHeight', { configurable: true, value: 20 });
    await click(button(mounted.host, 'Capture Photo'));
    assert.equal(button(mounted.host, 'Capture Photo').disabled, true);
    assert.equal(typeof finishCapture, 'function');
    await click(button(mounted.host, 'Cancel'));
    await act(async () => finishCapture(new Blob(['fixture photo'], { type: 'image/jpeg' })));
    assert.equal(mounted.host.querySelector('img'), null);
    assert.equal(mounted.host.querySelector('video'), null);
    assert.doesNotMatch(mounted.host.textContent, /Opening your crop photo/);
    assert.equal(button(mounted.host, 'Check crop').disabled, false);
    assert.ok(stopped > 0);
  } finally {
    await mounted.unmount();
    if (deviceDescriptor) Object.defineProperty(navigator, 'mediaDevices', deviceDescriptor); else delete navigator.mediaDevices;
    for (const [prototype, name, descriptor] of [[videoPrototype, 'play', playDescriptor], [videoPrototype, 'srcObject', sourceDescriptor], [canvasPrototype, 'getContext', contextDescriptor], [canvasPrototype, 'toBlob', blobDescriptor]]) {
      if (descriptor) Object.defineProperty(prototype, name, descriptor); else delete prototype[name];
    }
  }
});

test('unreadable images are rejected before submission and an invalid replacement clears busy state', async () => {
  const original = globalThis.createImageBitmap;
  const decode = deferred(); globalThis.createImageBitmap = () => decode.promise;
  const mounted = await mount(h(Fixture));
  try {
    await selectFile(mounted.host, new File(['broken image'], 'leaf.png', { type: 'image/png' }));
    assert.equal(button(mounted.host, 'Check crop').disabled, true);
    await selectFile(mounted.host, new File(['text'], 'notes.txt', { type: 'text/plain' }));
    assert.equal(button(mounted.host, 'Check crop').disabled, false);
    await act(async () => decode.resolve({ width: 0, height: 0, close() {} }));
    assert.match(mounted.host.textContent, /Choose a JPEG, PNG or WebP image/);
    globalThis.createImageBitmap = async () => { throw new Error('corrupted'); };
    await selectFile(mounted.host, new File(['corrupt image'], 'leaf.png', { type: 'image/png' }));
    assert.match(mounted.host.textContent, /This photo could not be opened/);
    assert.equal(mounted.host.querySelector('img'), null);
  } finally { await mounted.unmount(); if (original) globalThis.createImageBitmap = original; else delete globalThis.createImageBitmap; }
});

test('a valid gallery image can be replaced and removed without retaining its object URL', async () => {
  const original = globalThis.createImageBitmap; const originalRevoke = URL.revokeObjectURL; const revoked = [];
  globalThis.createImageBitmap = async () => ({ width: 20, height: 20, close() {} });
  URL.revokeObjectURL = (url) => { revoked.push(url); originalRevoke(url); };
  const mounted = await mount(h(Fixture));
  try {
    await selectFile(mounted.host, new File(['test photo'], 'leaf.png', { type: 'image/png' }));
    const first = mounted.host.querySelector('img').getAttribute('src');
    assert.match(mounted.host.textContent, /Photo ready \(<0.1 MB\)/);
    await selectFile(mounted.host, new File(['replacement'], 'other.png', { type: 'image/png' }));
    const second = mounted.host.querySelector('img').getAttribute('src');
    assert.ok(revoked.includes(first)); assert.notEqual(first, second);
    await click(button(mounted.host, 'Remove')); assert.ok(revoked.includes(second)); assert.equal(mounted.host.querySelector('img'), null);
  } finally { await mounted.unmount(); URL.revokeObjectURL = originalRevoke; if (original) globalThis.createImageBitmap = original; else delete globalThis.createImageBitmap; }
});

after(async () => { await server.close(); await browserWindow.happyDOM.close(); delete globalThis.scanCaptureFixture; });
