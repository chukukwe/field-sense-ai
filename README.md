# FieldVoice AI

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Existing crop assessment and photo API

The existing app keeps Firebase Authentication and Firestore for account-owned scan records, and uses the Node.js API for protected Gemini analysis and private photo storage. The API verifies Firebase ID tokens and checks the scan under `users/{uid}/scans/{scanId}` before analysis or photo operations. Original images stay in IndexedDB as a local fallback and are also saved to a private Supabase Storage bucket so the same signed-in account can view them on another device. The browser never receives the Supabase service-role credential.

### Local setup

1. Install the API dependencies: `npm --prefix server install`.
2. Copy `server/.env.example` to `server/.env` without overwriting an existing file. Set `GEMINI_API_KEY`, `GEMINI_MODEL`, `PORT`, `MAX_IMAGE_MB`, `ALLOWED_ORIGINS`, and `FIREBASE_PROJECT_ID` there. Set `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `SUPABASE_PHOTO_BUCKET` only after completing the Supabase setup below.
3. In Google AI Studio, create a Gemini API key and place it only in `server/.env` as `GEMINI_API_KEY`. Never use a `VITE_` prefix for this key.
4. For local Firebase Admin access, create a private service-account key only if needed and keep it outside this repository. Set `GOOGLE_APPLICATION_CREDENTIALS` to its path in `server/.env` (or use an already configured Application Default Credentials environment). Do not commit or share the JSON file. The Admin account needs Firestore access to the project.
5. Keep the existing Firebase web configuration in the root `.env.local`; it is used by the browser for Firebase Authentication and Firestore client access.
6. Start both services with `npm run dev:all`. The frontend remains at Vite's local URL; Vite proxies `/api` to `http://localhost:8787` by default. Alternatively, run `npm run dev` and `npm run server:dev` in separate terminals.

### Private photo storage setup

1. Create a Supabase project in the Supabase dashboard. This is a separate project from Firebase; no Supabase project or credentials are assumed to exist.
2. In **Storage**, create a bucket named `crop-photos` and leave **Public bucket** turned off. Set its maximum file size to 8 MB and allowed MIME types to `image/jpeg`, `image/png`, and `image/webp` (or use a smaller limit if the backend `MAX_IMAGE_MB` is lowered).
3. In Supabase **Project Settings → API Keys**, copy the project URL and current server-only Secret API key into `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in `server/.env` (for local development) or Render's private environment (for deployment). Never put this credential in `.env.local`, a `VITE_` variable, Netlify, frontend code, or Git. If your project only offers the legacy `service_role` key, it can be used through `SUPABASE_SERVICE_ROLE_KEY`; treat it as a secret. The backend handles the current `sb_secret_...` key in the `apikey` header and the legacy JWT key with both `apikey` and bearer authorization.
4. Keep the bucket private. The Render API is the only Storage caller: it uses the verified Firebase UID, verifies the Firestore scan belongs to that UID, and computes the only allowed path as `users/{uid}/scans/{scanId}/photo`. It does not accept a storage path from the browser. Private retrieval is proxied through the authenticated API with `Cache-Control: private, no-store`; no public URL or long-lived signed URL is created.
5. Firestore `cloudPhotoPath` is updated only after Storage confirms the upload. If the Firestore update fails, the API attempts to remove a newly uploaded object and the browser keeps its IndexedDB copy. For an existing scan, open Scan Details and choose **Save photo to your account** to migrate a local IndexedDB photo. If it is missing on that device, choose the original image file again. Existing scan records and diagnoses are not modified during this process.

The API requires `SUPABASE_URL`, either `SUPABASE_SECRET_KEY` or the legacy `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_PHOTO_BUCKET` for photo storage. Until configured, photo endpoints return a clear configuration error and local copies remain available. `SUPABASE_PHOTO_BUCKET` defaults to `crop-photos`.

`VITE_API_BASE_URL` in the root frontend environment is optional. Leave it empty for the same-origin `/api` path and local Vite proxy. Set it to the deployed API base URL only for production frontend builds. It is not secret.

## SeasonSense AI

SeasonSense is available to signed-in users at `/season-sense` and from the existing hamburger menu. The home promotion links there; the existing crop scan remains available from the Home screen's **Scan a Crop** action.

The first supported recommendation and forecast profile is Eket, Akwa Ibom. The location field matches the place name to that configured profile; it does not geocode or verify a farmer's exact location. Other locations are reported as unsupported. The authenticated Render route `GET /api/season/weather?location=eket` proxies Open-Meteo with fixed Eket coordinates verified through GeoNames. The upstream request asks for up to seven days; the UI displays the actual returned date coverage and values rather than assuming seven days arrived. Weather is optional context and does not select crops. The backend caches the response for 15 minutes, rate-limits each verified Firebase UID, and returns an explicit unavailable response rather than invented weather values.

Crop recommendations use deterministic, source-linked month windows: IITA's Nigeria cassava guide (April–May and, in some two-rainy-season zones, August) and NAERLS's humid-zone SAMMAZ 63 guidance (late February–March and late July–August). These are potential matches that still require local rain, soil, variety and extension checks. Okra is not recommended automatically because the available NAERLS record only says wet-season planting and this app has no verified current Eket field conditions. The IITA yam document is a regeneration guide rather than an Eket-specific production calendar, so it is not used to recommend yam. NiMet's August–October 2026 update is shown as limited broad climate context and is not used to select crops. SeasonSense does not ask Gemini to generate agricultural recommendations.

Legacy SeasonSense farm-plan records, if present, are not read, migrated, overwritten, or deleted by the current recommendation feature. No current app workflow uses or exposes those records.

The forecast and guidance tests use mocked Open-Meteo responses. The in-memory per-user weather limiter is per server process; if the Render service runs multiple instances, use a shared store or confirm the per-instance limit is sufficient. The route does not trust arbitrary forwarded IP headers or configure Express proxy trust. Live forecast availability, Firestore Emulator authorization, and deployed rules require manual verification. Review and test the rules in the Firebase Emulator before deployment.

### Checks

- `npm run build` builds the existing frontend.
- `npm run typecheck` type-checks the frontend and builds the TypeScript API.
- `npm run lint` lints the existing app.
- `npm run lint:server` lints API and tests.
- `npm run server:test` runs mocked API tests; they do not call Gemini or Firebase.
- `npm run server:build` builds the API to `server/dist`.
- `GET /health` confirms that the API process responds. It does not verify Firebase credentials or Gemini access.

### Deployment

Deploy `server/` as a separate Render Node.js web service with Root Directory `server`, Build Command `npm install && npm run build`, and Start Command `npm start`. Set `GEMINI_API_KEY`, `GEMINI_MODEL`, `MAX_IMAGE_MB`, `ALLOWED_ORIGINS`, `FIREBASE_PROJECT_ID`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (or the legacy `SUPABASE_SERVICE_ROLE_KEY`), and `SUPABASE_PHOTO_BUCKET` in Render's private environment settings. Render supplies `PORT`. Configure a least-privilege Firebase runtime identity with access to the project's Firestore and Firebase Authentication token verification; if using a service-account JSON credential instead, store it as a private Render secret/file and point `GOOGLE_APPLICATION_CREDENTIALS` to it, never commit it.

In Netlify, set the site build command to `npm run build` and publish directory to `dist`. Set `VITE_API_BASE_URL` to the Render HTTPS service origin (no trailing slash) and set the six existing `VITE_FIREBASE_*` values from the registered Firebase web app. These are frontend public Firebase web-app settings, not private service credentials. Configure Render `ALLOWED_ORIGINS` to the exact deployed Netlify site origin, including `https://` and any custom domain actually used; do not use `*`. The actual Netlify origin is not present in this repository, so it must be copied from the Netlify site dashboard. No deployment, dashboard change, Firebase rule deployment, or billing change is performed by these code changes.

After deployment, check the HTTPS `/health` endpoint and run an authenticated analysis request from the app using a test account and crop image. The health endpoint alone does not confirm Gemini model availability, quota, or Firestore authorization.
