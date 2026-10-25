import assert from 'node:assert/strict';
import { test } from 'node:test';
import { selectDevGeminiSettings } from '../devEnvironment.mjs';

test('missing dev Gemini settings reuse only the two allowed canonical keys', () => {
  const canonical = {
    GEMINI_API_KEY: 'canonical-test-key', GEMINI_MODEL: 'gemini-test-model',
    FIREBASE_PROJECT_ID: 'production-project', GOOGLE_APPLICATION_CREDENTIALS: 'production.json',
    SUPABASE_URL: 'https://production.example', SUPABASE_SECRET_KEY: 'production-test-secret', PORT: '9999',
  };
  assert.deepEqual(selectDevGeminiSettings({}, canonical), {
    GEMINI_API_KEY: 'canonical-test-key', GEMINI_MODEL: 'gemini-test-model',
  });
});

test('explicit empty dev Gemini settings remain empty', () => {
  assert.deepEqual(selectDevGeminiSettings({ GEMINI_API_KEY: '', GEMINI_MODEL: '' }, {
    GEMINI_API_KEY: 'canonical-test-key', GEMINI_MODEL: 'canonical-test-model',
  }), { GEMINI_API_KEY: '', GEMINI_MODEL: '' });
});

test('dev values take precedence while a missing model may fall back independently', () => {
  assert.deepEqual(selectDevGeminiSettings({ GEMINI_API_KEY: 'dev-test-key' }, {
    GEMINI_API_KEY: 'canonical-test-key', GEMINI_MODEL: 'canonical-test-model',
  }), { GEMINI_API_KEY: 'dev-test-key', GEMINI_MODEL: 'canonical-test-model' });
});

test('absent canonical Gemini values do not introduce settings or inherited properties', () => {
  assert.deepEqual(selectDevGeminiSettings({}, Object.create({ GEMINI_API_KEY: 'inherited' })), {});
  assert.deepEqual(selectDevGeminiSettings({}, {}), {});
});
