# FarmPal

FarmPal is a crop-help app for Nigerian farmers. A user signs in, chooses a crop, takes or adds a photo, and gets a simple AI-assisted crop check. English is saved; Nigerian Pidgin translation and read-aloud controls are also available.

## Architecture

- React, TypeScript, and Vite provide the web app.
- Firebase Authentication and Firestore store signed-in accounts and user-owned scan records.
- The Node.js API verifies Firebase ID tokens, validates image uploads, requests Gemini assessments, and stores crop photos in a private Supabase Storage bucket.
- IndexedDB keeps a local copy of each scan photo. A failed cloud upload leaves the local copy intact.
- Firestore rules bind scan records to the authenticated user. The backend checks scan ownership before assessment and photo operations.

## Local setup

1. Install frontend and development dependencies with `npm install`.
2. Install API dependencies with `npm --prefix server install`.
3. Copy `.env.example` to `.env.local` without overwriting an existing file. Set the Firebase web-app values there. Keep server credentials out of this file.
4. Copy `server/.env.example` to `server/.env` without overwriting an existing file. Set `GEMINI_API_KEY`, `GEMINI_MODEL`, `FIREBASE_PROJECT_ID`, `ALLOWED_ORIGINS`, and the Supabase settings if photo sync is enabled.
5. For local Firebase Admin access, use Application Default Credentials or keep a service-account file outside this repository and set `GOOGLE_APPLICATION_CREDENTIALS` to its path. The runtime identity needs access to Firebase Authentication token verification and Firestore.
6. Run `npm run dev:all`. The frontend uses Vite's local URL and proxies `/api` to `http://localhost:8787`. The local allowed-origin example includes both `localhost` and `127.0.0.1`.

`VITE_API_BASE_URL` is optional. Keep it empty for the local Vite proxy. For a production frontend build, set it to the backend HTTPS origin without a trailing slash. It is a public endpoint setting, not a credential.

## Private photo storage

1. Create a Supabase Storage bucket named `crop-photos` and leave the public-bucket setting off. Set the size limit to 8 MB and allow JPEG, PNG, and WebP files, or use a lower size limit matching `MAX_IMAGE_MB`.
2. Set `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `SUPABASE_PHOTO_BUCKET` in the backend environment. `SUPABASE_SERVICE_ROLE_KEY` is supported only as a legacy fallback. Keep these credentials in the server environment; never place them in frontend variables, Netlify, browser code, or Git.
3. The backend verifies the signed-in user's scan record and constructs the storage path as `users/{uid}/scans/{scanId}/photo`. It does not accept an arbitrary storage path from the browser. Photo retrieval is proxied through the authenticated API and is not public.
4. Firestore photo references are updated only after Storage confirms an upload. If the reference update fails, the API attempts to remove a newly uploaded object. The browser retains its IndexedDB copy.

Without Supabase configuration, private photo sync is unavailable. Local scan photos remain available on the device. Assessment records still require Firebase authentication and the backend's Firestore access.

## Scan flow and assessment data

- Crop choice, custom crop-name validation, and image validation happen before submission and are checked again by the backend.
- The scanner saves the original image to IndexedDB and scan metadata locally, then submits the same scan ID, image, Firebase ID token, crop choice, and optional notes for assessment.
- The backend validates the bearer token, image bytes and MIME type, scan ID, crop fields, and ownership. For an offline-created local scan, the authenticated request can create the user's Firestore record before it saves the assessment.
- Failed assessments keep the same scan and can be retried using its saved image. If the photo is missing locally, the app can retrieve the private cloud copy when one exists.
- Nigerian Pidgin translation is requested separately. It is temporary display text and does not overwrite the saved English assessment.
- Gemini output is validated before saving. Results are guidance for inspection and are not a confirmed diagnosis.

## Farm Guide and sample results

- Farm Guide asks for a state and LGA, then the **See plan** button opens a brief preparation state followed by the selected zone's current-month and next-month crop calendar. Crop cards expand to show an image and short illustrative planting notes. The location and calendar data are local; it makes no weather or location-service requests.
- The state/LGA names come from the MIT-licensed `xosasx/nigerian-local-government-areas` dataset; see `src/data/LGA_SOURCE_LICENSE.txt`. The LGA-to-zone map is a latitude/coastal heuristic, not an official boundary map. 375 LGAs are flagged for review.
- Every crop-calendar row in the included seed data is marked `draft` internally. Farm Guide shows the estimated zone and seasonal windows, but it does not show live weather forecasts or verified planting dates. Farmers should confirm planting decisions locally.
- If the backend reports a known Gemini quota limit, timeout, or temporary outage, the user can choose to view a prepared crop example. The app does not show it automatically.
- Sample crop results are marked as samples and are not written to scan history, Firestore, or analytics. Authentication, photo checks, and scan ownership rules stay in place.

## Environment variables

**Frontend:** `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, optional `VITE_REQUIRE_EMAIL_VERIFICATION`, and optional `VITE_API_BASE_URL`.

**Backend:** `GEMINI_API_KEY`, `GEMINI_MODEL`, `PORT`, `MAX_IMAGE_MB`, `ALLOWED_ORIGINS`, `FIREBASE_PROJECT_ID`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (or the legacy `SUPABASE_SERVICE_ROLE_KEY`), and `SUPABASE_PHOTO_BUCKET`. Render supplies `PORT`. `GOOGLE_APPLICATION_CREDENTIALS` is only needed when using a local service-account file instead of workload identity or Application Default Credentials.

Never place Gemini or Supabase credentials in a `VITE_*` variable. Firebase web configuration is public client configuration; Firebase Admin credentials are private server credentials.

## Checks

Run the scripts defined in the root `package.json`:

- `npm run typecheck` checks frontend types and builds the API TypeScript.
- `npm run lint` checks the frontend and shared code.
- `npm run lint:server` checks API code and tests.
- `npm run server:test` runs mocked API and storage tests plus mounted UI checks for scan progress, Farm Guide, and sample results. It does not call live Gemini, Supabase, or Firebase services.
- `npm run test:rules` runs Firestore Rules tests in the Firebase Emulator.
- `npm run build` creates the production frontend in `dist`.
- `npm run server:build` creates the production API in `server/dist`.

## Deployment

Deploy `server/` as a separate Render Node.js web service with Root Directory `server`, Build Command `npm install && npm run build`, and Start Command `npm start`. Add the Gemini, Firebase, and private Supabase backend settings through Render's private environment settings. Use a least-privilege runtime identity for Firebase Admin where possible.

For Netlify, use Build Command `npm run build` and publish directory `dist`. Set the frontend's `VITE_API_BASE_URL` to the Render HTTPS service origin and provide the registered Firebase web-app configuration. Configure backend `ALLOWED_ORIGINS` with the exact deployed frontend origin, including `https://` and any custom domain. Do not use `*` or add server credentials to Netlify. This repository does not change Render or Netlify service settings, deploy Firebase rules, or verify live external services.

After deployment, check `/health`, then test an authenticated assessment with a test account and crop photo. A healthy process response does not prove that Firebase credentials, Firestore permissions, Gemini access, or private photo storage are configured correctly.
