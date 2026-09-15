# Forma - React LMS frontend

A responsive learning platform connected to the existing LMS API. The client contains discovery, searchable courses, public course details, sign-in and registration, saved courses, purchased learning library, lesson player and progress, profile settings, and an instructor studio for drafts, video uploads, and publishing.

## Run the whole website

Use Node 22.12+ (Node 24 recommended). From the repository root (`server-challenge`):

```powershell
npm run dev
```

Open **http://localhost:8000**. The command builds this React app and starts Express to serve it alongside the API. Set the backend `CLIENT_URL=http://localhost:8000`. No second terminal or frontend server is required. Restart `npm run dev` after frontend source edits to rebuild; backend edits restart automatically.

For a fresh clone, run `npm run install:all` in the repository root first and configure the backend `.env` from `env.example`.

Optional frontend-only development still uses `npm run dev:client` from the repository root (Vite on 5175), alongside `npm run dev:api`. Set `CLIENT_URL=http://localhost:5175` only for that optional setup.

A client `.env` is optional for the default setup. Copy `.env.example` if changing configuration:

| Variable               | Purpose                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------- |
| API_TARGET             | Development proxy destination; never exposed to browser code                            |
| VITE_API_BASE_URL      | Browser API prefix, defaults to `/api/v1`                                               |
| VITE_PAYMENT_PROVIDERS | Comma-separated options to display: `razorpay,stripe`, or just your configured provider |

**Never put JWT, MongoDB, Cloudinary, Stripe secret, or Razorpay secret keys in the client.** Vite variables prefixed `VITE_` are public build-time values. Provider secrets remain in the server environment. Razorpay's public checkout key is returned by the order endpoint.

## How the implementation works

The design uses cream surfaces, forest green, a restrained lime accent, and consistent spacing. Newsreader headings and DM Sans interface text are bundled locally. The book illustration and category cover fallbacks are CSS artwork. Course images supplied by instructors replace those fallbacks. Shared components keep forms, cards, navigation, errors, and buttons consistent across screens.

| Location                      | Responsibility                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------ |
| src/App.jsx                   | Lazy-loaded React Router pages and authenticated/instructor route guards       |
| src/components                | Shared layout, course cards, form controls, loading and error states           |
| src/pages                     | Individual student and instructor workflows                                    |
| src/contexts/AuthContext.jsx  | Session profile, sign-in, sign-out, expired-session handling                   |
| src/contexts/SavedContext.jsx | Browser-local saved courses, separated by account                              |
| src/lib/api.js                | Cookie credentials, JSON/multipart requests, cancellation, timeouts and errors |
| src/lib/checkout.js           | Razorpay checkout plus server verification; validated Stripe redirect          |
| src/hooks/useResource.js      | Loading, retry and request cancellation on navigation                          |
| src/styles.css and src/styles | Responsive layout and shared visual system                                     |

The browser fetches the current profile using the backend's HttpOnly cookie; it does not store authentication tokens in localStorage. Route guards improve navigation, while the backend remains responsible for authorization. The player uses signed video URLs returned only to authorized learners and refreshes them when switching lessons. Completion is explicitly marked by the learner.

Catalog filters live in the URL so searches can be refreshed and shared. Forms use native labels and validation, with server errors displayed next to the workflow. Navigation includes a skip link, visible focus, a collapsible mobile menu, and reduced-motion support.

The backend public course-details endpoint was adjusted in both server folders to allow published course previews without exposing protected lesson URLs. Purchased course responses now include duration, level, and lesson counts for library cards. Regression coverage verifies public details and protected draft/edit behavior.

## Add real courses

A fresh database displays an honest empty library. Register a student account, then use the backend's documented instructor-provisioning procedure for a teaching account. Sign in as that instructor, open **Instructor studio**, create a draft with a thumbnail, upload lessons, and publish. Cloudinary must be configured for real uploads. Public registration deliberately cannot grant instructor privileges.

Saved courses are local to this browser and account, not synchronized between devices. There is no email/password-reset service, refund dashboard, or certificate generator in this implementation. Payment options require their server configuration; unavailable providers produce an actionable error.

## External course payments

In the instructor editor, external listings have a **Forma link access price (INR)**. Zero leaves the link free; a positive amount uses Razorpay checkout. The backend hides paid URLs until verified purchase, while the instructor owner retains preview access. Public catalog responses omit external URLs. After payment the details page refreshes and displays the link; purchased external listings also appear in My learning.

The checkout explicitly states that this fee unlocks a link in Forma, not the provider course. Any Udemy or other provider charges remain separate. This does not prevent visiting or sharing the third-party URL outside Forma. Existing course prices are not automatically changed.

## Verification

```powershell
npm run lint
npm test
npm run test:e2e
npm run build
npm run format:check
```

Browser tests use a separate in-memory fixture API on port 18000 and Vite on 5174. They never connect to MongoDB or initiate real payments. Windows tests use installed Microsoft Edge. On Linux CI, install Chromium with `npx playwright install --with-deps chromium` first. Browser assertions cover saved persistence, URL filters, login return paths, payment failure handling, learning progress, publishing, account validation, mobile navigation, and automated accessibility checks.

To inspect the populated design without changing your database, run `npm run dev:fixtures` and open http://localhost:5174. Fixture logins are `learner@forma.test` or `instructor@forma.test`, password `Secure123!`. These accounts exist only in the test fixture process. Fixture uploads are simulated; real upload, video playback and provider sandbox payments still require end-to-end verification with your configured services.

## Production hosting

From the repository root run `npm run install:all`, `npm run build`, then `npm start`. Express serves `client/dist` and the API on the same port, including the SPA fallback for page refreshes. The root Dockerfile also builds and serves both in one container. Configure HTTPS at your host/reverse proxy, backend `CLIENT_URL` to that public origin, and `TRUST_PROXY_HOPS` for the exact deployment topology. The optional Vite development proxy is not used in this setup.

Serve hashed `/assets/` files with a long immutable cache, and `index.html` with revalidation. Configure TLS, provider webhooks, MongoDB transactions/indexes, backups, and media credentials using the backend deployment guide. Verify provider test payments, webhook retries, and real signed-video playback before enabling live payments. `npm run preview` is a local build preview, not a production web server.

This `client` folder is inside the `server-challenge` Git repository. Frontend and backend are versioned together, with separate lockfiles and dependencies. From the repository root, `npm run dev:client` starts the frontend and `npm run build` creates `client/dist`.

References: [Vite build and environment configuration](https://vite.dev/guide/), [React Router declarative routing](https://reactrouter.com/start/declarative/routing), [Razorpay integration](https://razorpay.com/docs/payments/server-integration/nodejs/integration-steps/).

## Verification record

The final local run passed 11 unit tests, 12 Edge browser tests, ESLint, Prettier checks, and the production build. Both backend copies passed their 26 regression tests. Automated accessibility checks cover discovery, sign-in, course details, profile settings, and the classroom; this is not a substitute for a full assistive-technology audit.

Visual references below use isolated sample courses, not production database content:

- [Desktop discovery](docs/screenshots/discover.png)
- [Mobile discovery](docs/screenshots/mobile.png)
- [Sign-in](docs/screenshots/signin.png)
- [Course details](docs/screenshots/course.png)
- [Classroom](docs/screenshots/classroom.png)

## Vercel

Deploy the complete repository root, not this client folder. Follow [the root deployment guide](../README.md#deploy-to-vercel). The Vercel build sets a 4 MB upload limit automatically; the regular Node build retains the standard upload limits.
