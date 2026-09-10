# LMS API

Express/Mongoose backend for courses, student progress, Stripe Checkout and Razorpay. There is no frontend in this repository. `server-challenge` is the Git repository; the sibling `server-solution` contains the same hardened backend for reference. Deploy one copy.

## Run locally

Use Node.js 22 or 24 and a MongoDB replica set (MongoDB Atlas also works). Transactions are required for purchases, course creation and progress updates.

```powershell
cd server-challenge
npm.cmd ci
Copy-Item env.example .env
# Fill in .env using your own credentials.
npm.cmd run db:indexes
npm.cmd run dev
```

On macOS/Linux, use `npm` and `cp env.example .env`. Preserve your existing `.env` if you already have one. During startup troubleshooting, the weak development JWT secret was replaced with a random secret; other local credentials were preserved. Existing development sessions must sign in again.

Generate a JWT secret with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Never put credentials in version control or browser code. Use the `CLOUDINARY_*` environment names shown in `env.example`; the old `CLOUD_NAME`, `API_KEY`, and `API_SECRET` names still work for compatibility.

`npm test` starts its own temporary MongoDB replica set and uses fake credentials and mocked payment HTTP calls. It does not connect to `MONGO_URI` from your `.env`. On its first run, the test runner downloads a MongoDB executable. Dependencies install with `npm ci --ignore-scripts` too; the MongoDB download happens when tests run.

## Authentication and instructors

Signup always creates a student. Provision instructors from a trusted operator terminal:

```text
npm run user:role -- teacher@example.com instructor
```

This command changes the selected user's role and revokes their existing sessions. There is no public role-promotion endpoint. Password changes also revoke older sessions. Password recovery is not exposed: the old placeholder that claimed to send email without sending it was removed.

Browser requests must use `credentials: 'include'`. Mutating requests that use the session cookie must include `Origin: <CLIENT_URL>`. Cookies are HttpOnly, SameSite=Lax, and Secure in production. Serve the frontend and API on the same site, for example `learn.example.com` and `api.example.com`, or proxy the API under the frontend origin. Unrelated frontend/API sites are unsupported by this cookie policy.

## API routes

| Area | Routes |
| --- | --- |
| Health | `GET /health` (200 when connected, 503 otherwise) |
| Account | `POST /api/v1/user/signup`, `/signin`, `/signout`; `GET/PATCH /api/v1/user/profile`; `PATCH /api/v1/user/change-password`; `DELETE /api/v1/user/account` |
| Discovery | `GET /api/v1/course/published`, `/search` |
| Instructor courses | `GET/POST /api/v1/course`; `PATCH /api/v1/course/c/:courseId` |
| Course content | `GET /api/v1/course/c/:courseId`; `GET/POST /api/v1/course/c/:courseId/lectures` |
| Purchases | `GET /api/v1/purchase`; `GET /api/v1/purchase/course/:courseId/detail-with-status` |
| Stripe | `POST /api/v1/purchase/checkout/create-checkout-session`; `POST /api/v1/purchase/webhook` |
| Razorpay | `POST /api/v1/razorpay/create-order`, `/verify-payment`, `/webhook` |
| Progress | `GET /api/v1/progress/:courseId`; `PATCH /api/v1/progress/:courseId/lectures/:lectureId`, `/:courseId/complete`, `/:courseId/reset` |
| Instructor media | `POST /api/v1/media/upload-video` |

New courses start as drafts. The owner publishes with `PATCH /api/v1/course/c/:courseId` and `{ "isPublished": true }`. Uploads use multipart fields `thumbnail`, `video`, `avatar`, or `file` for the standalone media endpoint. Course creation requires `title`, `category`, `price`, and a thumbnail. Prices are INR with at most two decimal places. Paid checkout requires a positive price; free enrollment is not implemented.

Lists accept bounded `page` and `limit` parameters. Course search supports `query` (literal text), `categories` (comma-separated or repeated), `level`, `priceRange` (e.g. `100-500`), and `sortBy` (`newest`, `oldest`, `price-low`, `price-high`). Treat descriptions and other user text as plain text when rendering a frontend.

## Payment setup

Enable either provider by setting its credentials. Development can start without `RAZORPAY_WEBHOOK_SECRET`; only the Razorpay webhook endpoint remains disabled (503), and a startup warning explains why. Production requires that webhook secret. Disabled providers return 503. Both integrations calculate amounts from stored course prices and store the price/currency snapshot in a pending purchase.

Configure these public HTTPS webhook endpoints in the provider dashboards:

| Provider | URL | Events |
| --- | --- | --- |
| Stripe | `/api/v1/purchase/webhook` | `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired` |
| Razorpay | `/api/v1/razorpay/webhook` | `payment.captured` |

The raw body and provider signature are verified before processing. Stripe fulfillment requires paid status and matching amount, currency, and course/user metadata. Razorpay browser verification also fetches the payment and requires captured status, matching order, amount, currency, and authenticated purchaser. Enable automatic capture in Razorpay or arrange capture through your provider operations process. Browser redirection alone never grants access.

Purchase completion and both enrollment records commit in one MongoDB transaction. Repeated callbacks do not duplicate enrollment. A unique index allows one pending checkout per user/course. Stripe creation retries use an idempotency key. Razorpay reuses a persisted order; if order creation had an ambiguous failure before saving its ID, checkout intentionally returns 409 for operator reconciliation instead of creating another potentially payable order. Match the Razorpay receipt to the purchase `_id` before repairing that record. Never mark a payment completed based on a browser claim.

Monitor failed webhook deliveries and replay them after resolving the cause. Unknown purchase records return 503 so providers can retry. Handle refunds, disputes, deleted-account payments, and ambiguous provider responses through a documented support process; automatic refund/dispute reconciliation is not implemented. A refund performed in a dashboard does not automatically revoke course access in this version.

References used for the implementation: [Stripe webhook signatures](https://docs.stripe.com/webhooks), [Stripe fulfillment](https://docs.stripe.com/checkout/fulfillment), [Razorpay checkout verification](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/), and [Razorpay webhook validation](https://razorpay.com/docs/webhooks/validate-test/).

## Media and existing data

New lecture videos are uploaded with Cloudinary authenticated delivery. Buyers and owners receive signed download URLs that expire after five minutes; non-buyers receive URLs only for preview lectures. Fetch fresh course data when a URL expires. The media API does not return a permanent public URL. See [Cloudinary access control](https://cloudinary.com/documentation/control_access_to_media).

Before using an existing database:

1. Back it up and inspect duplicate pending purchases, duplicate provider IDs, and duplicate progress documents. `npm run db:indexes` adds required indexes and stops on conflicting data; it does not remove duplicates or drop indexes.
2. Reconcile legacy purchases against provider records. The previous implementation used a USD default for INR transactions and could accept forged Stripe notifications. Existing completed records cannot be assumed trustworthy. Do not blindly convert their currencies or statuses.
3. Migrate existing public Cloudinary videos to authenticated delivery, invalidate old public URLs, and retain/update each lecture's `publicId` and `videoFormat`. The API cannot revoke an already public URL just by hiding it. Verify previews and paid playback afterward.
4. Check legacy enrollment records against verified purchases. Access now uses completed purchases as the source of truth, not `enrolledStudents` alone.
5. Rotate JWT signing credentials at rollout so sessions created by the previous implementation are invalidated.

## Production deployment

Set `NODE_ENV=production`, a strong `JWT_SECRET`, an HTTPS `CLIENT_URL`, the replica-set `MONGO_URI`, Cloudinary credentials, and the chosen provider's live keys/webhook secret. Run `npm run db:indexes` before starting the service. Startup checks transaction support and required unique indexes.

```text
docker build -t lms-api .
docker run --env-file .env -p 8000:8000 --init lms-api
```

The container runs as a non-root user and includes a readiness health check. Configure TLS at your reverse proxy and set `TRUST_PROXY_HOPS` to the exact trusted topology; never trust arbitrary forwarded IPs. Limit request sizes/timeouts at the edge too. `SIGTERM` drains HTTP connections before closing MongoDB.

The built-in rate limiter is per process. This configuration targets a single API instance. Before running multiple instances, configure a shared rate-limit store or enforce global limits at the gateway. Collect structured server errors, monitor `/health` and webhook failures, enable database backups, and test restoration. Audit dependencies in CI and test provider sandbox payments, webhook retries, and Cloudinary playback before switching to live keys.

The supplied GitHub Actions workflow runs tests on Node 22/24, audits production dependencies, and builds the container. No deployment or live-account changes were performed during this review. A Docker build and external-provider end-to-end tests still need to be run in your deployment environment.
