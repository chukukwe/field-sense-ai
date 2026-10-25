# FarmPal

FarmPal is a crop-help app for Nigerian farmers. A user signs in, chooses a crop, takes or adds a photo, and gets a simple AI-assisted crop check. English is saved; Nigerian Pidgin translation and read-aloud controls are also available.

## Architecture

- React, TypeScript, and Vite provide the web app.
- Firebase Authentication and Firestore store signed-in accounts and user-owned scan records.
- The Node.js API verifies Firebase ID tokens, validates assessment images, requests Gemini assessments, and stores crop photos in the existing private Supabase Storage bucket.
- IndexedDB keeps a local copy of each scan photo. A failed cloud upload leaves the local copy intact.
- Firestore rules bind scan records to the authenticated user. Supabase service credentials stay on the backend; photo reads go through the authenticated API and are checked against the Firebase user's scan record.

## Local setup

1. Install frontend and development dependencies with `npm install`.
2. Install API dependencies with `npm --prefix server install`.
3. Copy `.env.example` to `.env.local` without overwriting an existing file. Set the Firebase web-app values there. Keep server credentials out of this file.
4. Copy `server/.env.example` to `server/.env` without overwriting an existing file. Set `GEMINI_API_KEY`, `GEMINI_MODEL`, `FIREBASE_PROJECT_ID`, `ALLOWED_ORIGINS`, `SUPABASE_URL`, and `SUPABASE_SECRET_KEY` (or the supported legacy `SUPABASE_SERVICE_ROLE_KEY`). Set `SUPABASE_PHOTO_BUCKET` to the private photo bucket name; the code defaults it to `crop-photos`.
5. For local Firebase Admin access, use Application Default Credentials or keep a service-account file outside this repository and set `GOOGLE_APPLICATION_CREDENTIALS` to its path. The runtime identity needs access to Firebase Authentication token verification and Firestore.
6. Run `npm run dev:all`. The frontend uses Vite's local URL and proxies `/api` to `http://localhost:8787`. The local allowed-origin example includes both `localhost` and `127.0.0.1`.

`VITE_API_BASE_URL` is optional. Keep it empty for the local Vite proxy. For a production frontend build, set it to the backend HTTPS origin without a trailing slash. It is a public endpoint setting, not a credential.

For the isolated FarmPal Test setup, run `npm run dev:farmpal`. Vite uses the `farmpal-dev` mode and its frontend configuration; the API loads `server/.env.farmpal-dev.local`. The API launcher requires the `farmpal-test` Firebase project and a service account for that project. Supabase URL, server key, and the `crop-photos` bucket must come from the isolated dev file. Only `GEMINI_API_KEY` and `GEMINI_MODEL`, when absent from that file, may fall back to the existing `server/.env`. An explicitly blank dev setting stays blank. Firebase, service-account, and photo-storage settings never fall back to `server/.env`, and the launcher does not rewrite environment files.

## Private crop-photo storage

New photos are uploaded to the private Supabase bucket through `POST /api/scans/{scanId}/photo`. The frontend sends the image and the signed-in farmer's Firebase ID token; the backend verifies the token, checks that the scan belongs to that Firebase UID, validates the image bytes and content type, and uploads to `users/{uid}/scans/{scanId}/photo`. It writes `cloudPhotoPath` to the Firestore scan record only after Supabase confirms the upload. Photos are retrieved through the authenticated `GET /api/scans/{scanId}/photo` route, which checks the same owner-scoped record and returns private, non-cacheable bytes. No Supabase key or public URL reaches the browser.

Keep the local IndexedDB photo until the upload and Firestore link both succeed. If either step fails, the scan and local photo remain available and the farmer can retry the photo sync without creating a second scan. The Supabase adapter uses the configured server secret in the `apikey` header; legacy service-role JWTs also receive bearer authorization. The credential format is recognized even if a legacy JWT is stored under `SUPABASE_SECRET_KEY`, or a new opaque key is stored under the legacy variable name.

Configure the existing Supabase bucket as private and allow the image content types used by the app: JPEG, PNG, and WebP. Do not allow `text/plain` just to accommodate a text diagnostic file. Keep `SUPABASE_URL` as the project root URL (without `/rest/v1`), `SUPABASE_SECRET_KEY` (or the supported legacy `SUPABASE_SERVICE_ROLE_KEY`), and `SUPABASE_PHOTO_BUCKET` only in the backend environment. No Supabase credential belongs in a `VITE_*` variable.

`firebasePhotoPath` and the owner-scoped Firebase Storage read/delete code remain only as compatibility for records created by the unfinished Firebase Storage migration. New uploads do not use Firebase Storage and do not require a Firebase Storage billing-plan change. The Firebase Storage rules and their emulator tests are retained so a pre-existing Firebase photo reference is not silently reinterpreted as a Supabase path. The frontend checks a local photo first, then the canonical Supabase photo, and then a legacy Firebase photo if needed. Do not remove old Firebase objects or references as part of this provider switch.

## Scan flow and assessment data

- Crop choice, custom crop-name validation, and image validation happen before submission and are checked again by the backend.
- The scanner saves the original image to IndexedDB and scan metadata locally, then submits the same scan ID, image, Firebase ID token, crop choice, and optional notes for assessment.
- The backend validates the bearer token, image bytes and MIME type, scan ID, crop fields, and ownership. For an offline-created local scan, the authenticated request can create the user's Firestore record before it saves the assessment.
- Failed assessments keep the same scan and can be retried using its saved image. If the photo is missing locally, the app can retrieve the private cloud copy when one exists.
- Submitting consumes the draft once. Empty/reloaded processing routes return to the capture form, and Back from a result cannot submit the photo again. Camera streams and unfinished capture requests are cleaned up when leaving.
- Pending, interrupted, failed, and unavailable scans can be checked again from Scan Details. Device-cache errors fall back to the existing private cloud photo; technical failures keep the original scan ID.
- Assessment requests stop after four minutes (including upload and response reading), allowing the backend's 200-second provider budget. Photo-service requests stop after one minute. Saved cloud results are preserved if a late HTTP error arrives.
- Repeating a completed assessment request returns its validated saved result without another provider call. An identical photo upload whose account link was interrupted can be safely linked on retry.
- Nigerian Pidgin translation is requested separately. It is temporary display text and does not overwrite the saved English assessment.
- Gemini output is validated before saving. Results are guidance for inspection and are not a confirmed diagnosis.

## Farm Guide

- Farm Guide asks for a state and LGA, then the **See plan** button opens a brief preparation state followed by the selected zone's current-month and next-month crop calendar. Crop cards expand to show an image and short illustrative planting notes. The location and calendar data are local; it makes no weather or location-service requests.
- The state/LGA names come from the MIT-licensed `xosasx/nigerian-local-government-areas` dataset; see `src/data/LGA_SOURCE_LICENSE.txt`. The LGA-to-zone map is a latitude/coastal heuristic, not an official boundary map. 375 LGAs are flagged for review.
- Every crop-calendar row in the included seed data is marked `draft` internally. Farm Guide shows the estimated zone and seasonal windows, but it does not show live weather forecasts or verified planting dates. Farmers should confirm planting decisions locally.

## Environment variables

**Frontend:** `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET` (used only to read legacy Firebase photo references), `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, optional `VITE_REQUIRE_EMAIL_VERIFICATION`, and optional `VITE_API_BASE_URL`.

**Backend:** `GEMINI_API_KEY`, `GEMINI_MODEL`, `PORT`, `MAX_IMAGE_MB`, `ALLOWED_ORIGINS`, `FIREBASE_PROJECT_ID`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (or the supported legacy `SUPABASE_SERVICE_ROLE_KEY`), and `SUPABASE_PHOTO_BUCKET` for private crop-photo storage. Render supplies `PORT`. `GOOGLE_APPLICATION_CREDENTIALS` is only needed when using a local service-account file instead of workload identity or Application Default Credentials.

Never place Gemini, Supabase, or Firebase Admin credentials in a `VITE_*` variable. Firebase web configuration is public client configuration; Firebase Admin credentials are private server credentials.

## Checks

Run the scripts defined in the root `package.json`:

- `npm run typecheck` checks frontend types and builds the API TypeScript.
- `npm run lint` checks the frontend and shared code.
- `npm run lint:server` checks API code and tests.
- `npm run server:test` runs mocked API and storage tests plus mounted UI checks for capture validation, camera cleanup, duplicate prevention, scan recovery, progress, history, and Farm Guide. It does not call live Gemini, Supabase, or Firebase services.
- `npm run test:rules` runs Firestore and Storage Rules tests in the Firebase Emulators.
- `npm run build` creates the production frontend in `dist`.
- `npm run server:build` creates the production API in `server/dist`.

## Deployment

Deploy `server/` as a separate Render Node.js web service with Root Directory `server`, Build Command `npm install && npm run build`, and Start Command `npm start`. Keep the Gemini, Firebase Admin, and Supabase backend settings in Render's private environment settings. Use a least-privilege runtime identity for Firebase Admin where possible.

For Netlify, use Build Command `npm run build` and publish directory `dist`. Set the frontend's `VITE_API_BASE_URL` to the Render HTTPS service origin and provide the registered Firebase web-app configuration, including the existing Storage bucket value. Configure backend `ALLOWED_ORIGINS` with the exact deployed frontend origin, including `https://` and any custom domain. Do not use `*` or add server credentials to Netlify. This repository does not change Render or Netlify service settings, deploy Firebase rules, or verify live external services.

After deployment, check `/health`, then test an authenticated assessment with a test account and crop photo. A healthy process response does not prove that Firebase credentials, Firestore permissions, Gemini access, or private photo storage are configured correctly.
