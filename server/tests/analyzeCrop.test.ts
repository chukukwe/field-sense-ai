import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';
import sharp from 'sharp';
import type { CropAssessmentResult } from '../src/assessmentSchema.js';
import { createApp, ProviderError, resolveRateLimitClientKey, shouldTrustRenderEdgeClientIp, type AnalyzeDependencies } from '../src/app.js';
import { assessWithGemini, classifyGeminiFailure, mapGeminiProviderFailure, parseGeminiResponseText, preservesNumbers } from '../src/gemini.js';

const png = await sharp({ create: { width: 1, height: 1, channels: 3, background: '#30a060' } }).png().toBuffer();
const assessment: CropAssessmentResult = {
  status: 'completed', cropIdentification: 'Cassava',
  observedSymptoms: ['Small yellow patches are visible.'],
  possibleCauses: [{ name: 'Possible leaf stress', explanation: 'Several conditions can cause this appearance.', likelihood: 'uncertain' }],
  confidence: 'low', confidenceReason: 'The photo shows only a small area of one leaf.',
  summary: 'A few yellow patches are visible, but the cause cannot be confirmed from this image.',
  recommendedActions: ['Take a closer photo of the full plant and leaf underside.'],
  preventionTips: ['Continue checking nearby plants for similar changes.'],
  whenToSeekHelp: 'Ask a local agricultural extension officer if symptoms spread.',
  limitations: ['Only one leaf is shown.'],
  disclaimer: 'AI-assisted visual assessment, not a confirmed diagnosis.',
};

describe('Gemini failure diagnostics', () => {
  it('finds a DNS error nested under the fetch TypeError without retaining its message', () => {
    const cause = Object.assign(new Error('private socket detail'), { code: 'ENOTFOUND' });
    const error = new TypeError('fetch failed', { cause });
    const diagnostics = classifyGeminiFailure(error);
    assert.deepEqual(diagnostics, { category: 'dns', code: 'ENOTFOUND' });
    assert.equal(JSON.stringify(diagnostics).includes('private socket detail'), false);
  });

  it('classifies an unwrapped fetch TypeError as a network failure', () => {
    assert.deepEqual(classifyGeminiFailure(new TypeError('fetch failed')), {
      category: 'network', code: 'FETCH_FAILED',
    });
  });

  it('recognizes TLS, connection, timeout, and HTTP failures from safe codes only', () => {
    assert.deepEqual(classifyGeminiFailure(Object.assign(new Error('TLS failure'), { code: 'ERR_TLS_CERT_ALTNAME_INVALID' })), {
      category: 'tls', code: 'ERR_TLS_CERT_ALTNAME_INVALID',
    });
    assert.deepEqual(classifyGeminiFailure(Object.assign(new Error('socket reset'), { code: 'ECONNRESET' })), {
      category: 'connection', code: 'ECONNRESET',
    });
    assert.deepEqual(classifyGeminiFailure(Object.assign(new Error('request cancelled'), { name: 'AbortError' })), {
      category: 'timeout', code: 'REQUEST_TIMEOUT',
    });
    assert.deepEqual(classifyGeminiFailure(Object.assign(new Error('operation aborted'), { name: 'TimeoutError' })), {
      category: 'timeout', code: 'REQUEST_TIMEOUT',
    });
    assert.deepEqual(classifyGeminiFailure(Object.assign(new Error('provider rejected request'), { status: 401 })), {
      category: 'http', code: 'HTTP_RESPONSE', httpStatus: 401,
    });
    assert.deepEqual(classifyGeminiFailure(Object.assign(new Error('gateway timed out'), { status: 504 })), {
      category: 'http', code: 'HTTP_RESPONSE', httpStatus: 504,
    });
  });

  it('does not expose arbitrary provider error text in diagnostics', () => {
    const diagnostics = classifyGeminiFailure(new Error('sensitive response body and credential-like text'));
    assert.deepEqual(diagnostics, { category: 'provider', code: 'UNKNOWN_PROVIDER_ERROR' });
    assert.equal(JSON.stringify(diagnostics).includes('sensitive'), false);
  });

  it('logs safe model, phase, HTTP and provider status details without response content or credentials', async () => {
    const logs: string[] = [];
    const originalInfo = console.info;
    const originalWarn = console.warn;
    const originalError = console.error;
    console.info = (...args: unknown[]) => { logs.push(args.map(String).join(' ')); };
    console.warn = (...args: unknown[]) => { logs.push(args.map(String).join(' ')); };
    console.error = (...args: unknown[]) => { logs.push(args.map(String).join(' ')); };
    const apiKey = 'unit-test-secret-key';
    const privateProviderMessage = 'private provider response detail';
    let fetchCalls = 0;
    let requestPath = '';
    let requestMethod = '';
    let requestTimeoutHeader = '';
    let requestPayload: Record<string, unknown> | undefined;
    try {
      await assert.rejects(
        assessWithGemini(Buffer.from('synthetic-image-bytes'), 'image/png', 'Cassava', 'private farmer note', apiKey, 'gemini-3.8-flash', 'safe-request-id', async (input, init) => {
          fetchCalls += 1;
          requestPath = new URL(String(input)).pathname;
          requestMethod = init?.method ?? '';
          requestTimeoutHeader = new Headers(init?.headers).get('x-server-timeout') ?? '';
          requestPayload = JSON.parse(String(init?.body)) as Record<string, unknown>;
          return Response.json({ error: { code: 504, status: 'DEADLINE_EXCEEDED', message: privateProviderMessage } }, {
            status: 504,
            headers: { server: 'Google Frontend', 'x-goog-request-id': 'provider-request-reference' },
          });
        }),
        (error: unknown) => error instanceof ProviderError && error.code === 'GEMINI_TIMEOUT',
      );
    } finally {
      console.info = originalInfo;
      console.warn = originalWarn;
      console.error = originalError;
    }

    assert.equal(fetchCalls, 1, 'SDK attempt limit must prevent retrying the provider request');
    assert.equal(requestPath, '/v1beta/models/gemini-3.8-flash:generateContent');
    assert.equal(requestMethod, 'POST');
    assert.equal(requestTimeoutHeader, '120');
    assert.ok(requestPayload);
    const generationConfig = requestPayload.generationConfig as Record<string, unknown>;
    const thinkingConfig = generationConfig.thinkingConfig as Record<string, unknown>;
    const contents = requestPayload.contents as Array<{ parts: Array<Record<string, unknown>> }>;
    assert.equal(thinkingConfig.thinkingLevel, 'LOW');
    assert.equal(contents[0]?.parts[1]?.inlineData && (contents[0].parts[1]!.inlineData as Record<string, unknown>).mimeType, 'image/png');
    const entries = logs.map((line) => JSON.parse(line) as Record<string, unknown>);
    const started = entries.find((entry) => entry.event === 'gemini_request_started');
    const response = entries.find((entry) => entry.event === 'gemini_http_response_received');
    const failed = entries.find((entry) => entry.event === 'gemini_request_failed');
    assert.equal(started?.model, 'gemini-3.8-flash');
    assert.equal(started?.phase, 'generate_content');
    assert.equal(started?.thinkingLevel, 'low');
    assert.equal(response?.httpStatus, 504);
    assert.equal(response?.responseOriginHint, 'google_server_header');
    assert.equal(failed?.httpStatus, 504);
    assert.equal(failed?.providerCode, 504);
    assert.equal(failed?.providerStatus, 'DEADLINE_EXCEEDED');
    const serializedLogs = logs.join('\n');
    for (const sensitive of [apiKey, privateProviderMessage, 'private farmer note', 'synthetic-image-bytes', 'provider-request-reference']) {
      assert.equal(serializedLogs.includes(sensitive), false, `diagnostics must not include ${sensitive}`);
    }
  });

  it('sends a single supported GenerateContent request and parses a mocked assessment response', async () => {
    const originalInfo = console.info;
    const logs: string[] = [];
    console.info = (...args: unknown[]) => { logs.push(args.map(String).join(' ')); };
    let fetchCalls = 0;
    let requestPayload: Record<string, unknown> | undefined;
    try {
      const result = await assessWithGemini(Buffer.from('synthetic-image-bytes'), 'image/png', 'Cassava', '', 'unit-test-secret-key', 'gemini-3.8-flash', 'mock-success-id', async (_input, init) => {
        fetchCalls += 1;
        requestPayload = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return Response.json({ candidates: [{ content: { role: 'model', parts: [{ text: JSON.stringify(assessment) }] }, finishReason: 'STOP' }] });
      });
      assert.deepEqual(result, assessment);
    } finally {
      console.info = originalInfo;
    }

    assert.equal(fetchCalls, 1);
    assert.ok(requestPayload);
    const generationConfig = requestPayload.generationConfig as Record<string, unknown>;
    const thinkingConfig = generationConfig.thinkingConfig as Record<string, unknown>;
    assert.equal(thinkingConfig.thinkingLevel, 'LOW');
    assert.ok(logs.some((line) => line.includes('"event":"gemini_response_parsed"')));
    assert.equal(logs.join('\n').includes('unit-test-secret-key'), false);
  });

  it('maps an upstream gateway timeout to the retryable timeout response', () => {
    const failure = mapGeminiProviderFailure(Object.assign(new Error('gateway response'), { status: 504 }));
    assert.equal(failure.code, 'GEMINI_TIMEOUT');
    assert.equal(failure.status, 504);
    assert.equal(failure.retryable, true);
    assert.equal(failure.publicMessage.includes('gateway response'), false);
  });

  it('keeps quota, credentials, and provider unavailability distinct', () => {
    for (const [status, code] of [[429, 'GEMINI_QUOTA'], [401, 'GEMINI_AUTH_FAILED'], [403, 'GEMINI_AUTH_FAILED'], [503, 'GEMINI_UNAVAILABLE']] as const) {
      const failure = mapGeminiProviderFailure(Object.assign(new Error('private upstream detail'), { status }));
      assert.equal(failure.code, code);
      assert.equal(failure.status, status === 401 || status === 403 ? 503 : status);
      assert.equal(failure.publicMessage.includes('private upstream detail'), false);
      assert.equal(failure.retryable, status === 429 || status === 503);
    }
  });

  it('parses valid structured JSON and rejects empty or malformed provider text safely', () => {
    assert.deepEqual(parseGeminiResponseText('{"summary":"visible symptoms"}'), { summary: 'visible symptoms' });
    for (const text of [undefined, null, '', '   ']) {
      assert.throws(() => parseGeminiResponseText(text), (error: unknown) => error instanceof ProviderError && error.code === 'EMPTY_MODEL_RESPONSE');
    }
    assert.throws(() => parseGeminiResponseText('{bad json'), (error: unknown) => error instanceof ProviderError && error.code === 'INVALID_MODEL_RESPONSE');
  });
});

function setup(overrides: Partial<AnalyzeDependencies> = {}) {
  const persisted: CropAssessmentResult[] = [];
  const fails: string[] = [];
  const failureMessages: string[] = [];
  const deps: AnalyzeDependencies = {
    verifyIdToken: async (token) => {
      if (token !== 'valid-owner-token' && token !== 'valid-other-token') throw new Error('invalid token');
      return { uid: token === 'valid-owner-token' ? 'owner' : 'other' };
    },
    claimScan: async (uid, id) => uid === 'owner' && id === 'scan-test' ? 'claimed' : 'missing',
    saveAssessment: async (_uid, _id, result) => { persisted.push(result); },
    failScan: async (_uid, id, message) => { fails.push(id); failureMessages.push(message); },
    assessImage: async () => assessment,
    allowedOrigins: ['http://localhost:5173'],
    limiterMax: 50,
    ...overrides,
  };
  return { app: createApp(deps), persisted, fails, failureMessages };
}

const auth = { Authorization: 'Bearer valid-owner-token' };

describe('rate-limit client identity', () => {
  it('keeps Express proxy trust disabled', () => {
    const { app } = setup();
    assert.equal(app.get('trust proxy'), false);
  });

  it('trusts the edge header only for a Render public web service', () => {
    assert.equal(shouldTrustRenderEdgeClientIp({ RENDER: 'true', RENDER_SERVICE_TYPE: 'web' }), true);
    assert.equal(shouldTrustRenderEdgeClientIp({ RENDER: 'true', RENDER_SERVICE_TYPE: 'pserv' }), false);
    assert.equal(shouldTrustRenderEdgeClientIp({ RENDER: 'false', RENDER_SERVICE_TYPE: 'web' }), false);
    assert.equal(shouldTrustRenderEdgeClientIp({}), false);
  });

  it('uses a valid trusted edge IP and ignores it when the Render trust gate is off', () => {
    const trusted = resolveRateLimitClientKey('203.0.113.10', '10.0.0.2', true);
    assert.notEqual(trusted, resolveRateLimitClientKey('203.0.113.11', '10.0.0.2', true));
    assert.equal(resolveRateLimitClientKey('203.0.113.10', '10.0.0.2', false), resolveRateLimitClientKey('203.0.113.11', '10.0.0.2', false));
  });

  it('falls back to a validated socket IP for missing, malformed, or untrusted edge headers', () => {
    const socketKey = resolveRateLimitClientKey(undefined, '10.0.0.2', true);
    assert.equal(resolveRateLimitClientKey('not-an-ip', '10.0.0.2', true), socketKey);
    assert.equal(resolveRateLimitClientKey('203.0.113.9', '10.0.0.2', false), socketKey);
    assert.equal(resolveRateLimitClientKey('203.0.113.9, 10.0.0.2', '10.0.0.2', true), socketKey);
  });

  it('keys Render rate limits by the overwritten client-IP header and ignores spoofed X-Forwarded-For', async () => {
    const previousRender = process.env.RENDER;
    const previousServiceType = process.env.RENDER_SERVICE_TYPE;
    const originalError = console.error;
    const errors: string[] = [];
    process.env.RENDER = 'true';
    process.env.RENDER_SERVICE_TYPE = 'web';
    console.error = (...args: unknown[]) => { errors.push(args.map(String).join(' ')); };
    try {
      const { app } = setup({ limiterMax: 1 });
      const firstClientRequest = await request(app).post('/api/analyze-crop')
        .set('CF-Connecting-IP', '203.0.113.10')
        .set('X-Forwarded-For', '198.51.100.10');
      const sameClientSpoofingRequest = await request(app).post('/api/analyze-crop')
        .set('CF-Connecting-IP', '203.0.113.10')
        .set('X-Forwarded-For', '198.51.100.11');
      const secondClientRequest = await request(app).post('/api/analyze-crop')
        .set('CF-Connecting-IP', '203.0.113.11')
        .set('X-Forwarded-For', '198.51.100.10');
      assert.equal(firstClientRequest.status, 401);
      assert.equal(sameClientSpoofingRequest.status, 429);
      assert.equal(secondClientRequest.status, 401);
      assert.equal(app.get('trust proxy'), false);
      assert.equal(errors.some((line) => line.includes('ERR_ERL_UNEXPECTED_X_FORWARDED_FOR')), false);
    } finally {
      console.error = originalError;
      if (previousRender === undefined) delete process.env.RENDER;
      else process.env.RENDER = previousRender;
      if (previousServiceType === undefined) delete process.env.RENDER_SERVICE_TYPE;
      else process.env.RENDER_SERVICE_TYPE = previousServiceType;
    }
  });

  it('uses a safe shared fallback if neither edge nor socket address is valid', () => {
    assert.equal(resolveRateLimitClientKey(undefined, undefined, true), 'unknown-client');
    assert.equal(resolveRateLimitClientKey('invalid', 'also-invalid', true), 'unknown-client');
    assert.equal(resolveRateLimitClientKey('203.0.113.9', 'also-invalid', false), 'unknown-client');
  });

  it('normalizes IPv6 keys consistently using express-rate-limit subnet handling', () => {
    const sameSubnetA = resolveRateLimitClientKey('2001:db8::1', undefined, true);
    const sameSubnetB = resolveRateLimitClientKey('2001:db8::2', undefined, true);
    const differentSubnet = resolveRateLimitClientKey('2001:db8:1::1', undefined, true);
    assert.equal(sameSubnetA, sameSubnetB);
    assert.notEqual(sameSubnetA, differentSubnet);
  });
});

describe('POST /api/analyze-crop', () => {
  it('ignores caller-controlled forwarded headers outside Render and safely falls back for invalid edge IPs', async () => {
    assert.equal(shouldTrustRenderEdgeClientIp(), false, 'this local test must run outside a Render public web service');
    const { app } = setup({ limiterMax: 1 });
    const withoutEdgeHeader = await request(app).post('/api/analyze-crop')
      .set('X-Forwarded-For', '198.51.100.1');
    const malformedEdgeHeader = await request(app).post('/api/analyze-crop')
      .set('CF-Connecting-IP', 'not-an-ip')
      .set('X-Forwarded-For', '198.51.100.99');
    const untrustedEdgeHeader = await request(app).post('/api/analyze-crop')
      .set('CF-Connecting-IP', '203.0.113.10')
      .set('X-Forwarded-For', '198.51.100.200');
    assert.equal(withoutEdgeHeader.status, 401);
    assert.equal(malformedEdgeHeader.status, 429);
    assert.equal(untrustedEdgeHeader.status, 429);
  });

  it('rejects missing and invalid Firebase ID tokens', async () => {
    const { app } = setup();
    assert.equal((await request(app).post('/api/analyze-crop')).status, 401);
    assert.equal((await request(app).post('/api/analyze-crop').set('Authorization', 'Bearer expired')).status, 401);
  });

  it('rejects a missing scan ID, unsupported crop, and missing image', async () => {
    const { app } = setup();
    assert.equal((await request(app).post('/api/analyze-crop').set(auth).field('cropType', 'Cassava')).status, 400);
    assert.equal((await request(app).post('/api/analyze-crop').set(auth).field('scanId', 'scan-test').field('cropType', 'Yam')).status, 400);
    assert.equal((await request(app).post('/api/analyze-crop').set(auth).field('scanId', 'scan-test').field('cropType', 'Cassava')).status, 400);
  });

  it('requires and passes a trimmed custom crop name when Others is selected', async () => {
    const { app } = setup({ assessImage: async (_image, _mime, crop) => { assert.equal(crop, 'Cocoyam'); return assessment; } });
    const missing = await request(app).post('/api/analyze-crop').set(auth)
      .field('scanId', 'scan-test').field('cropType', 'Other')
      .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });
    assert.equal(missing.status, 400);
    const response = await request(app).post('/api/analyze-crop').set(auth)
      .field('scanId', 'scan-test').field('cropType', 'Other').field('customCropName', '  Cocoyam  ')
      .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });
    assert.equal(response.status, 200);
  });

  it('rejects unsupported or malformed image bytes declared as PNG', async () => {
    const { app } = setup();
    const response = await request(app).post('/api/analyze-crop').set(auth)
      .field('scanId', 'scan-test').field('cropType', 'Cassava')
      .attach('image', Buffer.from('not an image'), { filename: 'crop.png', contentType: 'image/png' });
    assert.equal(response.status, 415);
  });

  it('rejects uploads over 8 MiB', async () => {
    const { app } = setup();
    const response = await request(app).post('/api/analyze-crop').set(auth)
      .field('scanId', 'scan-test').field('cropType', 'Cassava')
      .attach('image', Buffer.alloc(8 * 1024 * 1024 + 1, 1), { filename: 'crop.png', contentType: 'image/png' });
    assert.equal(response.status, 413);
  });

  it('does not analyze a scan outside the verified user scope', async () => {
    const { app, persisted } = setup();
    const response = await request(app).post('/api/analyze-crop').set({ Authorization: 'Bearer valid-other-token' })
      .field('scanId', 'scan-test').field('cropType', 'Cassava')
      .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });
    assert.equal(response.status, 404);
    assert.equal(persisted.length, 0);
  });

  it('registers a local-only scan under the UID from the verified token before analysis', async () => {
    const records = new Map<string, { cropType: string; observations: string }>();
    const { app, persisted } = setup({
      claimScan: async (uid, scanId, cropType, details) => {
        const recordKey = `${uid}/${scanId}`;
        const existing = records.get(recordKey);
        if (existing && (existing.cropType !== cropType || existing.observations !== details.observations)) return 'missing';
        if (!existing) records.set(recordKey, { cropType, observations: details.observations });
        return 'claimed';
      },
    });
    const response = await request(app).post('/api/analyze-crop').set(auth)
      .field('scanId', 'scan-local-first').field('cropType', 'Cassava').field('observations', 'Yellow lower leaves')
      .attach('image', png, { filename: 'original.png', contentType: 'image/png' });
    assert.equal(response.status, 200);
    assert.deepEqual(records.get('owner/scan-local-first'), { cropType: 'Cassava', observations: 'Yellow lower leaves' });
    assert.equal(records.has('other/scan-local-first'), false);
    assert.deepEqual(persisted, [assessment]);
  });

  it('validates and persists a successful result', async () => {
    let providerMime = '';
    const { app, persisted } = setup({ assessImage: async (_image, mime) => { providerMime = mime; return assessment; } });
    const response = await request(app).post('/api/analyze-crop').set(auth)
      .field('scanId', 'scan-test').field('cropType', 'Cassava').field('observations', 'Yellowing on lower leaves')
      .attach('image', png, { filename: 'untrusted-name.png', contentType: 'image/png' });
    assert.equal(response.status, 200);
    assert.equal(providerMime, 'image/png');
    assert.deepEqual(response.body.assessment, assessment);
    assert.deepEqual(persisted, [assessment]);
  });

  it('logs correlated assessment start and completion timings without scan or user data', async () => {
    const entries: string[] = [];
    const originalInfo = console.info;
    let providerRequestId = '';
    console.info = (...args: unknown[]) => { entries.push(args.map(String).join(' ')); };
    try {
      const { app } = setup({
        assessImage: async (_image, _mime, _crop, _observations, requestId) => {
          providerRequestId = requestId;
          return assessment;
        },
      });
      const response = await request(app).post('/api/analyze-crop').set(auth)
        .field('scanId', 'scan-test').field('cropType', 'Cassava')
        .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });
      assert.equal(response.status, 200);
    } finally {
      console.info = originalInfo;
    }

    const events = entries.map((line) => JSON.parse(line) as Record<string, unknown>);
    const started = events.find((entry) => entry.event === 'assessment_started');
    const completed = events.find((entry) => entry.event === 'assessment_completed');
    assert.ok(started && completed);
    assert.equal(started.requestId, providerRequestId);
    assert.equal(completed.requestId, providerRequestId);
    assert.equal(typeof started.requestPreparationMs, 'number');
    assert.equal(typeof completed.providerElapsedMs, 'number');
    assert.equal(typeof completed.totalElapsedMs, 'number');
    assert.equal(entries.join('\n').includes('scan-test'), false);
    assert.equal(entries.join('\n').includes('valid-owner-token'), false);
  });

  it('logs a sanitized failure category and timing when the provider fails', async () => {
    const entries: string[] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => { entries.push(args.map(String).join(' ')); };
    try {
      const { app } = setup({ assessImage: async () => { throw new ProviderError('GEMINI_TIMEOUT', 504); } });
      const response = await request(app).post('/api/analyze-crop').set(auth)
        .field('scanId', 'scan-test').field('cropType', 'Cassava')
        .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });
      assert.equal(response.status, 504);
    } finally {
      console.warn = originalWarn;
    }

    const failure = entries.map((line) => JSON.parse(line) as Record<string, unknown>)
      .find((entry) => entry.event === 'assessment_failed');
    assert.ok(failure);
    assert.equal(failure.failureCategory, 'GEMINI_TIMEOUT');
    assert.equal(failure.httpStatus, 504);
    assert.equal(typeof failure.providerElapsedMs, 'number');
    assert.equal(typeof failure.totalElapsedMs, 'number');
    assert.equal(entries.join('\n').includes('scan-test'), false);
    assert.equal(entries.join('\n').includes('valid-owner-token'), false);
  });

  it('accepts supported JPEG, PNG, and WebP photos with matching provider MIME types', async () => {
    const images = [
      { mime: 'image/jpeg', bytes: await sharp({ create: { width: 2, height: 2, channels: 3, background: '#30a060' } }).jpeg().toBuffer() },
      { mime: 'image/png', bytes: png },
      { mime: 'image/webp', bytes: await sharp({ create: { width: 2, height: 2, channels: 3, background: '#30a060' } }).webp().toBuffer() },
    ];
    const providerMimes: string[] = [];
    const { app } = setup({ claimScan: async () => 'claimed', assessImage: async (_image, mime) => { providerMimes.push(mime); return assessment; } });
    for (const image of images) {
      const response = await request(app).post('/api/analyze-crop').set(auth)
        .field('scanId', 'scan-test').field('cropType', 'Cassava')
        .attach('image', image.bytes, { filename: 'crop-photo', contentType: image.mime });
      assert.equal(response.status, 200);
    }
    assert.deepEqual(providerMimes, images.map(({ mime }) => mime));
  });

  it('normalizes a large valid photo to a bounded JPEG before assessment', async () => {
    const largePng = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#30a060' } }).png().toBuffer();
    let providerImage: Buffer | undefined;
    let providerMime = '';
    const { app } = setup({ assessImage: async (image, mime) => { providerImage = image; providerMime = mime; return assessment; } });
    const response = await request(app).post('/api/analyze-crop').set(auth)
      .field('scanId', 'scan-test').field('cropType', 'Cassava')
      .attach('image', largePng, { filename: 'crop.png', contentType: 'image/png' });
    assert.equal(response.status, 200);
    assert.equal(providerMime, 'image/jpeg');
    assert.ok(providerImage);
    const prepared = await sharp(providerImage).metadata();
    assert.equal(prepared.format, 'jpeg');
    assert.ok((prepared.width ?? 0) <= 2048);
    assert.ok((prepared.height ?? 0) <= 2048);
  });

  it('reports Firestore assessment-save failures separately from Gemini failures', async () => {
    const { app, persisted, fails } = setup({
      saveAssessment: async () => { throw Object.assign(new Error('private Firestore details'), { code: 'firestore/unavailable' }); },
    });
    const response = await request(app).post('/api/analyze-crop').set(auth)
      .field('scanId', 'scan-test').field('cropType', 'Cassava')
      .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });
    assert.equal(response.status, 503);
    assert.equal(response.body.error.code, 'ASSESSMENT_SAVE_FAILED');
    assert.equal(response.body.error.retryable, true);
    assert.doesNotMatch(JSON.stringify(response.body), /private Firestore details/);
    assert.equal(persisted.length, 0);
    assert.deepEqual(fails, ['scan-test']);
  });

  it('does not make duplicate provider requests for completed or processing scans', async () => {
    let providerCalls = 0;
    for (const claim of ['complete', 'processing'] as const) {
      const { app } = setup({
        claimScan: async () => claim,
        assessImage: async () => { providerCalls += 1; return assessment; },
      });
      const response = await request(app).post('/api/analyze-crop').set(auth)
        .field('scanId', 'scan-test').field('cropType', 'Cassava')
        .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });
      assert.equal(response.status, 409);
    }
    assert.equal(providerCalls, 0);
  });

  it('rejects malformed model output and marks the scan failed', async () => {
    const { app, persisted, fails } = setup({ assessImage: async () => ({ status: 'completed', diagnosis: 'invented' }) });
    const response = await request(app).post('/api/analyze-crop').set(auth)
      .field('scanId', 'scan-test').field('cropType', 'Cassava')
      .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });
    assert.equal(response.status, 502);
    assert.equal(persisted.length, 0);
    assert.deepEqual(fails, ['scan-test']);
  });

  it('handles malformed JSON from the provider without returning an assessment', async () => {
    const { app, persisted, fails } = setup({
      assessImage: async () => { throw new ProviderError('INVALID_MODEL_RESPONSE', 502, 'The assessment could not be validated.'); },
    });
    const response = await request(app).post('/api/analyze-crop').set(auth)
      .field('scanId', 'scan-test').field('cropType', 'Cassava')
      .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });
    assert.equal(response.status, 502);
    assert.equal(response.body.error.code, 'INVALID_MODEL_RESPONSE');
    assert.equal(persisted.length, 0);
    assert.deepEqual(fails, ['scan-test']);
  });

  it('returns retryable timeout and quota responses without success data', async () => {
    for (const [status, code] of [[504, 'GEMINI_TIMEOUT'], [429, 'GEMINI_QUOTA']] as const) {
      const { app, fails, failureMessages } = setup({
        assessImage: async () => { throw new ProviderError(code, status, 'Try later.'); },
      });
      const response = await request(app).post('/api/analyze-crop').set(auth)
        .field('scanId', 'scan-test').field('cropType', 'Cassava')
        .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });
      assert.equal(response.status, status);
      assert.equal(response.body.error.code, code);
      assert.deepEqual(fails, ['scan-test']);
      assert.deepEqual(failureMessages, ['Try later.']);
    }
  });

  it('allows the same saved scan to be assessed again after a retryable failure', async () => {
    let providerCalls = 0;
    const { app, fails, persisted } = setup({
      claimScan: async () => 'claimed',
      assessImage: async () => {
        providerCalls += 1;
        if (providerCalls === 1) throw new ProviderError('GEMINI_TIMEOUT', 504, 'Retry this scan.');
        return assessment;
      },
    });
    const send = () => request(app).post('/api/analyze-crop').set(auth)
      .field('scanId', 'scan-test').field('cropType', 'Cassava')
      .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });
    assert.equal((await send()).status, 504);
    assert.equal((await send()).status, 200);
    assert.equal(providerCalls, 2);
    assert.deepEqual(fails, ['scan-test']);
    assert.deepEqual(persisted, [assessment]);
  });

  it('returns a safe provider failure response without internal error details', async () => {
    const { app } = setup({ assessImage: async () => { throw new Error('private provider response detail'); } });
    const response = await request(app).post('/api/analyze-crop').set(auth)
      .field('scanId', 'scan-test').field('cropType', 'Cassava')
      .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });
    assert.equal(response.status, 502);
    assert.equal(response.body.error.message, 'The crop assessment service could not complete this request. Try again later.');
    assert.equal(JSON.stringify(response.body).includes('private provider response detail'), false);
  });

  it('stores an inconclusive result as distinct from technical failure', async () => {
    const inconclusive = { ...assessment, status: 'inconclusive' as const, cropIdentification: 'unknown' as const, possibleCauses: [], summary: 'The image does not show enough detail to assess the crop.' };
    const { app, persisted } = setup({ assessImage: async () => inconclusive });
    const response = await request(app).post('/api/analyze-crop').set(auth)
      .field('scanId', 'scan-test').field('cropType', 'Cassava')
      .attach('image', png, { filename: 'crop.png', contentType: 'image/png' });
    assert.equal(response.status, 200);
    assert.equal(response.body.assessment.status, 'inconclusive');
    assert.deepEqual(persisted, [inconclusive]);
  });
});

describe('POST /api/assessment/translate-pidgin', () => {
  it('requires authentication and preserves the structured assessment contract', async () => {
    const { app } = setup({ translateAssessment: async (input) => ({ ...input, summary: 'E get small yellow mark, but we no fit confirm wetin cause am.' }) });
    assert.equal((await request(app).post('/api/assessment/translate-pidgin').send({ assessment })).status, 401);
    const response = await request(app).post('/api/assessment/translate-pidgin').set(auth).send({ assessment });
    assert.equal(response.status, 200);
    assert.equal(response.body.assessment.status, assessment.status);
    assert.equal(response.body.assessment.confidence, assessment.confidence);
    assert.match(response.body.assessment.summary, /E get/);
  });

  it('rejects incomplete source assessments before requesting translation', async () => {
    let calls = 0;
    const { app } = setup({ translateAssessment: async () => { calls += 1; return assessment; } });
    const response = await request(app).post('/api/assessment/translate-pidgin').set(auth).send({ assessment: { summary: 'only a summary' } });
    assert.equal(response.status, 400);
    assert.equal(calls, 0);
  });
});

describe('Pidgin translation safety check', () => {
  it('preserves every number in translated fields', () => {
    const source = { ...assessment, summary: 'Check again in 48 hours.' };
    assert.equal(preservesNumbers(source, { ...source, summary: 'Check again in 48 hours.' }), true);
    assert.equal(preservesNumbers(source, { ...source, summary: 'Check again in 24 hours.' }), false);
  });
});
