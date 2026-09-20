# Payments, media, and deployment

Enable either provider by setting its credentials. Development can start without `RAZORPAY_WEBHOOK_SECRET`; only the Razorpay webhook endpoint remains disabled (503), and a startup warning explains why. Production requires that webhook secret. Disabled providers return 503. Both integrations calculate amounts from stored course prices and store the price/currency snapshot in a pending purchase.

Configure these public HTTPS webhook endpoints in the provider dashboards:

| Provider | URL                        | Events                                                                                               |
| -------- | -------------------------- | ---------------------------------------------------------------------------------------------------- |
| Stripe   | `/api/v1/purchase/webhook` | `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired` |
| Razorpay | `/api/v1/razorpay/webhook` | `payment.captured`                                                                                   |

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

Production rate limits use atomic MongoDB counters shared by all instances. Run `npm run db:indexes` to create the `ratelimits.expiresAt` TTL index before deploying. Development uses an in-memory limiter. Vercel trusts its own proxy automatically; other hosts use the configured `TRUST_PROXY_HOPS`. Collect structured server errors, monitor `/health` and webhook failures, enable database backups, and test restoration. Audit dependencies in CI and test provider sandbox payments, webhook retries, and Cloudinary playback before switching to live keys.

The supplied GitHub Actions workflow runs tests on Node 22/24, audits production dependencies, and builds the container. Verify the Docker build, provider sandbox payments, webhook retries, and real media playback in your deployment environment before going live.

For the single-domain Vercel deployment, follow [the root deployment guide](../README.md#deploy-to-vercel). Its file upload limit is 4 MB; the Node/Docker deployment retains the configured limit.
