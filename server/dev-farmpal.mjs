import dotenv from 'dotenv';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectDevGeminiSettings } from './devEnvironment.mjs';

const serverDirectory = dirname(fileURLToPath(import.meta.url));
const devEnvironmentFile = resolve(serverDirectory, '.env.farmpal-dev.local');

if (!existsSync(devEnvironmentFile)) {
  throw new Error('FarmPal dev environment file is missing.');
}

const loaded = dotenv.config({ path: devEnvironmentFile, override: true });
if (loaded.error) throw new Error('FarmPal dev environment could not be loaded.');
const devConfig = loaded.parsed ?? {};

if (devConfig.FIREBASE_PROJECT_ID !== 'farmpal-test' || process.env.FIREBASE_PROJECT_ID !== 'farmpal-test') {
  throw new Error('FarmPal dev must use the farmpal-test Firebase project.');
}

const configuredCredential = devConfig.GOOGLE_APPLICATION_CREDENTIALS;
if (!configuredCredential) throw new Error('FarmPal Test service-account path is required.');
const credentialPath = isAbsolute(configuredCredential)
  ? configuredCredential
  : resolve(serverDirectory, configuredCredential);
if (!existsSync(credentialPath)) throw new Error('FarmPal Test service-account file is unavailable.');

try {
  const credential = JSON.parse(readFileSync(credentialPath, 'utf8'));
  if (credential.type !== 'service_account' || credential.project_id !== 'farmpal-test') {
    throw new Error('FarmPal Test service-account validation failed.');
  }
} catch {
  throw new Error('FarmPal Test service-account validation failed.');
}

const supabaseUrlValue = devConfig.SUPABASE_URL;
const supabaseKey = devConfig.SUPABASE_SECRET_KEY || devConfig.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrlValue || !supabaseKey || devConfig.SUPABASE_PHOTO_BUCKET !== 'crop-photos') {
  throw new Error('FarmPal dev requires its Supabase URL, secret key, and crop-photos bucket in the dev environment file.');
}

let supabaseUrl;
try {
  supabaseUrl = new URL(supabaseUrlValue);
} catch {
  throw new Error('FarmPal dev SUPABASE_URL is not an absolute URL; copy the HTTPS Project URL from the FarmPal Test Supabase dashboard.');
}
if (supabaseUrl.protocol !== 'https:') {
  throw new Error('FarmPal dev SUPABASE_URL must use HTTPS.');
}
if (!/^[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl.hostname)) {
  throw new Error('FarmPal dev SUPABASE_URL must use a Supabase project host.');
}
if (supabaseUrl.pathname !== '/'
  || supabaseUrl.search
  || supabaseUrl.hash
  || supabaseUrl.username
  || supabaseUrl.password) {
  throw new Error('FarmPal dev SUPABASE_URL must be the project root without an API path, query, or credentials.');
}

process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialPath;
process.env.GCLOUD_PROJECT = 'farmpal-test';
process.env.GOOGLE_CLOUD_PROJECT = 'farmpal-test';
process.env.DOTENV_CONFIG_PATH = devEnvironmentFile;

const devVariables = new Set(Object.keys(loaded.parsed ?? {}));
for (const variable of [
  'GEMINI_API_KEY',
  'GEMINI_MODEL',
  'SUPABASE_URL',
  'SUPABASE_SECRET_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_PHOTO_BUCKET',
]) {
  if (!devVariables.has(variable)) delete process.env[variable];
}

// Firebase, credentials and private photo storage must always come from the
// isolated dev file. Only absent Gemini settings may reuse the existing local
// provider configuration; dotenv.parse does not modify process.env or log it.
const canonicalEnvironmentFile = resolve(serverDirectory, '.env');
const needsGeminiFallback = ['GEMINI_API_KEY', 'GEMINI_MODEL'].some((key) => !Object.hasOwn(devConfig, key));
const canonicalConfig = needsGeminiFallback && existsSync(canonicalEnvironmentFile)
  ? dotenv.parse(readFileSync(canonicalEnvironmentFile, 'utf8'))
  : {};
for (const [key, value] of Object.entries(selectDevGeminiSettings(devConfig, canonicalConfig))) {
  process.env[key] = value;
}

await import('./dist/server/src/index.js');
