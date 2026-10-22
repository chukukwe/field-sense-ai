# React + TypeScript + Vite

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

## Gemini crop assessment API

The assessment API runs as a separate Node.js service. It verifies Firebase ID tokens, checks that the scan document exists under the verified user's `users/{uid}/scans/{scanId}` path, sends the selected image directly from memory to Gemini, validates the structured response, and updates that existing scan document through Firebase Admin. Photos remain in the browser's IndexedDB; they are not uploaded to Firebase Storage or saved by the API.

### Local setup

1. Install the API dependencies: `npm --prefix server install`.
2. Copy `server/.env.example` to `server/.env` without overwriting an existing file. Set `GEMINI_API_KEY`, `GEMINI_MODEL`, `PORT`, `MAX_IMAGE_MB`, `ALLOWED_ORIGINS`, and `FIREBASE_PROJECT_ID` there.
3. In Google AI Studio, create a Gemini API key and place it only in `server/.env` as `GEMINI_API_KEY`. Never use a `VITE_` prefix for this key.
4. For local Firebase Admin access, create a private service-account key only if needed and keep it outside this repository. Set `GOOGLE_APPLICATION_CREDENTIALS` to its path in `server/.env` (or use an already configured Application Default Credentials environment). Do not commit or share the JSON file. The Admin account needs Firestore access to the project.
5. Keep the existing Firebase web configuration in the root `.env.local`; it is used by the browser for Firebase Authentication and Firestore client access.
6. Start both services with `npm run dev:all`. The frontend remains at Vite's local URL; Vite proxies `/api` to `http://localhost:8787` by default. Alternatively, run `npm run dev` and `npm run server:dev` in separate terminals.

`VITE_API_BASE_URL` in the root frontend environment is optional. Leave it empty for the same-origin `/api` path and local Vite proxy. Set it to the deployed API base URL only for production frontend builds. It is not secret.

### Checks

- `npm run build` builds the existing frontend.
- `npm run typecheck` type-checks the frontend and builds the TypeScript API.
- `npm run lint` lints the existing app.
- `npm run lint:server` lints API and tests.
- `npm run server:test` runs mocked API tests; they do not call Gemini or Firebase.
- `npm run server:build` builds the API to `server/dist`.
- `GET /health` confirms that the API process responds. It does not verify Firebase credentials or Gemini access.

### Deployment

Deploy `server/` as a separate Node.js 22+ service. Build with `npm run server:build` from the repository root (or `npm run build` from `server/`), then run `npm start` from `server/`. Configure `GEMINI_API_KEY`, `GEMINI_MODEL`, `PORT`, `MAX_IMAGE_MB`, `ALLOWED_ORIGINS`, and `FIREBASE_PROJECT_ID` as platform secrets/environment variables. Configure `GOOGLE_APPLICATION_CREDENTIALS` only for local development; on a supported cloud platform attach a least-privilege runtime identity with Firestore access and use Application Default Credentials/workload identity instead of a service-account JSON key. Set `VITE_API_BASE_URL` to the HTTPS API base URL when building the frontend, and set `ALLOWED_ORIGINS` to the exact frontend origin(s). Follow the chosen platform's secret-management, IAM, and billing requirements; no Firebase Storage setup or Firebase Blaze upgrade is used by this code. Do not deploy Firebase rules from this project as part of deploying the API.

After deployment, check the HTTPS `/health` endpoint and run an authenticated analysis request from the app using a test account and crop image. The health endpoint alone does not confirm Gemini model availability, quota, or Firestore authorization.
