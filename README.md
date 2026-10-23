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

SeasonSense uses the selected state and LGA to show two different kinds of crop information. Historical crop reports describe past household survey observations. Draft planting windows are broad zone-level dates transcribed from a published crop calendar. Neither is a verified, farm-specific recommendation. A separate NiMet panel adds seasonal rainfall context when an exact state/LGA/year record is available; weather does not choose crops. Missing crop or rainfall data shows as unavailable instead of borrowing dates from another zone. The older authenticated Open-Meteo forecast endpoint remains separate from this screen.

SeasonSense does not use Gemini to generate crop recommendations. NiMet errors or missing records do not hide otherwise available crop-calendar entries.

### Historical crop timing dataset

The LGA zone key now comes from NAERLS' [States in Nigeria by Ecological Zone](https://nfhl.naerls.gov.ng/index.php?action=faq&cat=1&id=1&artlang=en) list, using its state defaults and only the LGA exceptions it names. Latitude and coastline guesses are not used for crop-calendar lookup. The source does not state a reuse license, so attribution and the source URL are recorded; confirm reuse terms before redistribution. Its Humid Forest subtypes are not mapped to individual LGAs and remain merged into the broad Humid Forest category. Source-name mismatches with a safe canonical match are review-flagged. Eight exceptions have no safe destination zone and stay unverified; a total of 89 LGA mappings are currently flagged for local review. No crop windows are returned for those locations.

The separate [African Crop Calendar dataset](https://doi.org/10.6084/m9.figshare.28659557), derived from LSMS-ISA household plot surveys, contains 19,322 grouped planting/harvest observations for 56 crop types across 469 Nigerian LGAs. These are reports from the 2015, 2018, and 2023 survey waves, not forecasts or planting recommendations; survey samples grouped by LGA are not representative LGA estimates. Exact normalized state/LGA matching is used, and unmatched names are excluded rather than guessed. The imported data retains original crop labels, survey years, evidence counts, source URL, and geographic scope. The CSV is licensed CC BY 4.0.

The zone calendar uses the University of Bonn ZEF Dataverse [Crop calender of Maize & Cassava in Nigeria](https://bonndata.uni-bonn.de/dataset.xhtml?persistentId=doi:10.60507/FK2/PI929D), licensed under ODC-By 1.0. Only its explicit March–August sowing ranges are imported. Rates and harvest dates are not shown. Entries remain marked `draft` and are rendered as source windows, not “plant now” recommendations. Raw source rows exist for four of the seven broad NAERLS zones—Derived Savanna, Humid Forest, Northern Guinea Savanna, and Southern Guinea Savanna—for maize and cassava. The Humid Forest rows are withheld because the source only says “parts” of named states and does not identify the covered LGAs. Three zones currently have usable draft windows for mapped, non-review LGAs: Derived Savanna (188 LGAs), Northern Guinea Savanna (55), and Southern Guinea Savanna (51). Sahel, Sudan, and Mid-altitude have no usable window in this source. A Borno-only Sahelian row was excluded because the source does not identify which Borno LGAs it covers. The source does not support specific current-month or harvest advice. No zone has verified planting recommendations.

To reproduce the imports after changing the source files, run `npm --prefix server run season:zones-import`, then `npm --prefix server run season:bonn-calendar-import`. These update `server/data/recommendations.db`; the checked-in database contains the current zone provenance and draft calendar rows.

All 277 generic drafts and four Akwa Ibom pilot calendar rows were archived in `crop_calendar_archive` during schema migration 2. Their active recommendation rows were removed; the pilot review notes were archived separately. All 774 canonical LGAs remain. 469 have matched historical observations; 305 currently show no usable location-level observations. The Bonn zone-level draft rows are separate from these LGA historical observations. The previous pilot importer is blocked after migration 2 so it cannot reintroduce retired rows.

To regenerate the derived seed from the public CSV and lookup, run `npm --prefix server run season:calendar-prepare`. This streams the source, performs exact canonical state/LGA matching, and writes `server/data/african-crop-calendar-sourced.json`. To import it, back up the database and run `npm --prefix server run season:calendar-import`. Importing is repeatable; inspect the generated counts and run SQLite integrity checks before distributing an updated database.

Legacy SeasonSense farm-plan records, if present, are not read, migrated, overwritten, or deleted by the current recommendation feature. No current app workflow uses or exposes those records.

The forecast and guidance tests use mocked Open-Meteo responses. The in-memory per-user weather limiter is per server process; if the Render service runs multiple instances, use a shared store or confirm the per-instance limit is sufficient. The route does not trust arbitrary forwarded IP headers or configure Express proxy trust. Live forecast availability, Firestore Emulator authorization, and deployed rules require manual verification. Review and test the rules in the Firebase Emulator before deployment.

### NiMet seasonal rainfall data

SeasonSense can request NiMet seasonal rainfall predictions for the selected state, LGA, and year. The response adds context only; it does not select crops or replace the crop calendar. The backend uses NiMet's documented `GET /srp` route with `state`, `lga_name`, and `year`, then keeps only exact normalized state/LGA/year matches. Supported fields are onset, cessation, length of season, and annual rainfall. Missing fields stay blank, and the app does not add units that NiMet's published example does not specify. A missing NiMet record or failed request does not hide crop calendar entries.

The backend reads the secret from `NIMET_API_KEY` and sends it in the `x-api-key` header. Never put this key in the frontend or a `VITE_*` variable.

For local development, copy `server/.env.example` to `server/.env`, add your value after `NIMET_API_KEY=`, and restart the backend. `server/.env` is ignored by Git.

### Scan retries, custom crops, and Nigerian Pidgin

Failed assessments can be retried from Scan Details with the existing scan ID and saved image. Cloud-photo upload is a separate operation; a failed upload keeps the local copy and does not cancel an otherwise valid assessment. Choose **Others** to enter a crop name; the server validates it and includes that name in the assessment prompt while retaining the canonical crop type in the scan record.

Assessment results can be translated to Nigerian Pidgin through the authenticated backend route `/api/assessment/translate-pidgin`. The translation is temporary display text; the saved English assessment remains canonical. The server keeps structured severity and confidence fields and rejects translations that change numbers. Browser speech playback is offered only when the browser reports a Nigerian Pidgin voice.

The active LGA zone lookup uses the NAERLS ecological-zone list and its named LGA exceptions; legacy latitude/coastal estimates are not used by the recommendation API. Eight source exceptions cannot be matched safely to a current LGA and remain unverified; 89 LGAs are flagged for local review, and locations with unverified or review-flagged mappings receive no zone dates. The imported African Crop Calendar records remain historical household survey reports, separate from draft zone planting windows.

For production, open the FieldVoice backend service in the [Render Dashboard](https://dashboard.render.com/), select **Environment**, add `NIMET_API_KEY` under **Environment Variables**, and save. Do not add this key to Netlify. Render applies saved environment variables on the next deploy or restart; the key is not changed by this repository update.

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
