# Production verification report

Reviewed on 2026-09-20. Scope: the existing `server-challenge` application, preserving its architecture and payment contracts.

**Status:** prepared for deployment and verified locally. This is not a claim that a Vercel deployment, provider approval, or live payment acceptance has been completed. No real payment was made and no existing application database was modified by this review.

## 1. Architecture

React/Vite and React Router serve the interface; contexts manage authentication, saved courses, and notifications. Relative `/api/v1` calls reach Express. MongoDB/Mongoose transactions maintain purchases, enrollments, courses, and progress. Authentication uses signed JWTs in HttpOnly cookies. Razorpay/Stripe handle payments; Cloudinary handles media. The normal Node entry serves the React build and API together; Vercel uses the request-based `api/index.js` entry.

## 2. Problems found

The database connection cache retained a resolved promise after disconnect, and readiness verification was coupled to initialization. Session-service failures were silently treated like signed-out users. Password-change attempts lacked the stricter authentication limiter. The UI lacked dark mode. Vercel static entry routing could bypass Express's HTML security headers. Upload hints did not consistently reflect the Vercel cap. Formatting errors would fail the existing CI gate. Operations documentation still described process-local production rate limits.

## 3. Bugs fixed

Connection initialization now coalesces concurrent requests, resets after disconnect/failure, and exposes an explicit readiness check. Protected pages offer retry on session-service errors instead of redirecting to sign-in. Production upload hints match enforced limits. Root/index HTML routes pass through Express. The serverless failure response works with native Node responses and does not expose configuration values.

## 4. Security

Password changes use the stricter authentication limiter. Production MongoDB rate counters are tested for atomic increments across independent instances, with hashed client identifiers and TTL cleanup. Existing origin checks, secure cookies, role/ownership checks, validation, signature verification, and protected-media behavior remain in place. Local environment files are ignored by Git, Vercel, and Docker. No real credentials were found in the tracked-file credential-pattern scan; the only match was an intentional fake URI in a redaction test. This scan is not a comprehensive forensic audit of repository history.

## 5. Dark mode

The header provides Light, Dark, and System choices. Preference survives reloads and synchronizes across tabs; System follows OS changes. `client/public/theme.js` applies the theme before React, without adding unsafe inline-script permissions. Forest surfaces, lime accents, readable controls, focus states, errors, skeletons, and navigation preserve the existing Forma design. Course illustrations retain their original artwork palette.

## 6. UI and accessibility

Checked public discovery/catalog, authentication, empty states, checkout, account, classroom, instructor studio, and editor. Browser tests cover desktop, 768px tablet, and 390px mobile layouts, horizontal overflow, theme persistence, and WCAG A/AA automated checks. Screenshots were visually inspected. This does not replace human assistive-technology testing. Razorpay's hosted modal appearance is controlled by the provider.

## 7. Backend

Regression coverage includes registration, validation, cookie origins, password/session revocation, authorization, course ownership, purchased access, progress, upload restrictions, production indexes, shared rate counters, and connection reuse. Production/serverless startup is tested against temporary replica sets. The persistent entry is started in both development and production modes during tests.

## 8. Payments

Existing verification was retained and tested: server-priced INR orders, order ownership, captured status, HMAC/raw webhook signatures, amount/currency checks, transactional fulfillment, repeated callbacks, and paid external-link hiding. Provider calls are mocked; the production UI smoke disables payment providers entirely. No real funds or provider test-account transactions were used. Ambiguous Razorpay order-creation failures can require manual reconciliation; automatically creating replacement orders could duplicate an unresolved checkout. Refund/dispute reconciliation remains operational work.

## 9. Deployment

Vercel builds both packages and serves one domain. API/health requests reach the serverless entry; root/index and SPA fallback receive Express HTML security headers. Database pools are reused per instance. Production rate limits are shared in MongoDB. Vercel uploads use temporary storage and cap each file at 4,000,000 bytes because its request limit includes multipart overhead. Large hosted videos require Node/Docker hosting or an authenticated direct-upload implementation.

The Vercel config passed constraints from the published schema using draft-07 compatibility (the published schema mixes older metadata with newer experimental-field syntax). Actual Vercel cloud packaging/routing still needs a preview deployment. The Docker image built successfully; a container check confirmed app import, built frontend/theme assets, a non-root user, and exclusion of `.env`, `client/.env`, and `.git`.

## 10. Files added

- `.env.example`: placeholder-only environment template, matching legacy `env.example`.
- `client/public/theme.js`: early theme initialization and synchronization.
- `client/src/components/ThemeControl.jsx`: accessible theme selector.
- `client/src/styles/theme.css`: dark appearance and responsive control styling.
- `test/production.test.js`: production/serverless entry and startup regression checks.
- `client/tests/production-smoke.mjs`: built UI + real local API/database verification.
- `docs/PRODUCTION_REVIEW.md`: this report and acceptance checklist.

## 11. Important files modified

`database/db.js`, `api/index.js`, `app.js`, `services/rateLimitStore.js`, `config/env.js`, `vercel.json`, `.dockerignore`, `.github/workflows/ci.yml`, `package.json`, `README.md`, and `docs/OPERATIONS.md`. Frontend changes are in `index.html`, `main.jsx`, `App.jsx`, `Layout.jsx`, `AuthContext.jsx`, upload helpers/forms, and browser tests. Other frontend edits normalize formatting for the existing CI requirements.

## 12. Verification

| Check | Result |
| --- | --- |
| Backend/serving/startup suite | 35 tests passed |
| Frontend unit suite | 11 tests passed |
| Browser journeys | 17 tests passed |
| Production UI smoke | Passed against built React, real Express, isolated MongoDB, secure test origin |
| ESLint and Prettier | Passed in final `npm run check` |
| Standard and Vercel frontend builds | Passed |
| Docker build and container packaging check | Passed |
| Installed dependency trees | Both `npm ls --depth=0` checks passed |
| Production dependency audit | Zero reported vulnerabilities in both packages |
| Environment configuration | Local validation passed; values withheld |
| Git secret-file ignore checks | Passed |

The Docker build performed clean lockfile installs in both stages. Browser tests used Edge on Windows. CI uses Chromium. The Windows test runner needed its isolated fixture process stopped after tests completed; no user application process was stopped. Harmless color-environment and Git line-ending notices can appear. One repeated production smoke attempt failed while starting temporary MongoDB (exit 48); rerunning with diagnostic logging selected a fresh local port and passed the entire smoke. No application assertion was bypassed. MongoDB documents this as a listener-startup failure ([exit codes](https://www.mongodb.com/docs/manual/reference/exit-codes/)).

## 13. Remaining launch work

- Deploy a Vercel preview and validate actual routing, HTTPS, cookies, function logs, and Atlas network access.
- Configure production credentials and run additive indexes against the intended deployment database. No production migration was performed here.
- Test Razorpay test-mode checkout and signed webhook deliveries on the deployed domain. Live keys require provider approval.
- Verify actual Cloudinary uploads/playback; unit mocks cannot prove account permissions or existing-media privacy.
- Supply real business/contact information and actual privacy, terms, and refund/cancellation policies. No business policies were invented.
- Configure monitoring, backups, restore testing, and manual payment reconciliation/support.
- Existing limitations: browser-local saved courses, no email password recovery, no automated refunds/disputes, no certificates, and no large Vercel lesson uploads. Public external URLs can be independently found or shared; the fee only gates access to the link inside Forma.

## 14. Environment

Required: `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`, and `NODE_ENV=production` on deployment. For Razorpay: matching `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET`. For media: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Optional Stripe requires both secret variables. `VITE_PAYMENT_PROVIDERS=razorpay` selects Razorpay in the build and is public configuration. Node hosts may set `PORT`, `TRUST_PROXY_HOPS`, `MAX_FILE_SIZE`, and `UPLOAD_PATH`. Vercel manages the port, proxy handling, temporary upload path, and file cap. Do not place secrets in `VITE_` variables.

## 15. Local commands

From `server-challenge`, for a new clone:

```powershell
npm run install:all
Copy-Item .env.example .env
# Fill in .env; do not overwrite an existing configured file.
npm run db:indexes
npm run dev
```

Open `http://localhost:8000`. Existing installations can run `npm run dev` directly.

## 16. Verification and production commands

```powershell
npm run check
npm run test:e2e
npm run build:vercel
npm run test:production-ui
```

For a Node/Docker host, configure production variables and HTTPS at the host/proxy, then:

```powershell
npm run build
npm run db:indexes
npm start
```

Vercel uses `npm run build:vercel` automatically and invokes the API function; it does not run `npm start`.

## 17. Deployment sequence and acceptance checklist

Push the reviewed source and lockfiles to GitHub. Import the complete application root into Vercel with Framework Preset Other and Node 24. Configure the exact HTTPS origin, Atlas URI, JWT secret, and provider secrets. Run `npm run db:indexes` from a trusted machine against that Atlas database. Deploy, verify `/health`, refresh nested frontend routes, then complete provider test-mode and media checks. Enable live payments only after approval and operational readiness.

- [x] Existing architecture and working features preserved.
- [x] Clean installs verified inside Docker.
- [x] Development and production Node entries start with isolated MongoDB.
- [x] Built frontend and real backend work together in the production smoke.
- [x] Registration, cookie sessions, protected routes, role/ownership rules covered.
- [x] Course, payment-verification, purchase-access, and progress regressions covered.
- [x] Dark mode, preference persistence, responsive layouts, and automated accessibility covered.
- [x] Lint, formatting, backend/unit/browser tests, and final combined checks passed.
- [x] Production builds and Docker packaging verified.
- [x] Secret files ignored and placeholder-only environment examples provided.
- [x] Production URLs configurable and errors redacted.
- [x] README and deployment guidance updated.
- [ ] Actual Vercel deployment, provider test-mode acceptance, real media, and business launch requirements completed by operator.
