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
  plugins: [react()],
  server: { middlewareMode: true },
});
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { AssessmentProgressIndicator } = await viteServer.ssrLoadModule('/src/components/common/AssessmentProgressIndicator.tsx');
const { useAssessmentProgress } = await viteServer.ssrLoadModule('/src/hooks/useAssessmentProgress.ts');
const { requestCropAssessment } = await viteServer.ssrLoadModule('/src/data/assessmentApi.ts');
const { act, createElement, StrictMode, useEffect, useRef, useState } = React;

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
    async render() { await act(async () => root.render(element)); },
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
    { name: 'malformed', response: () => Response.json({ assessment: { summary: 'incomplete' } }), message: /could not be validated|incomplete/i },
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

  const fetcher = async () => await new Promise(() => {});
  const mount = createMount(createElement(AssessmentHarness, { fetcher }));
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
  }
});

after(async () => {
  browserWindow.happyDOM.abort();
  await viteServer.close();
});
