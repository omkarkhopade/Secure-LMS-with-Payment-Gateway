import Stripe from 'stripe';
import { Course } from '../models/course.model.js';
import { CoursePurchase } from '../models/coursePurchase.model.js';
import { AppError, catchAsync } from '../middleware/error.middleware.js';
import { preparePurchase, minorUnits, verifyAmount, fulfillPurchase } from '../services/purchase.js';
import { courseView } from '../services/courseAccess.js';
export function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) throw new AppError('Stripe payments are not configured', 503);
  return new Stripe(process.env.STRIPE_SECRET_KEY, { httpClient: Stripe.createFetchHttpClient(), timeout: 10000, maxNetworkRetries: 2 });
}
export const initiateStripeCheckout = catchAsync(async (req, res) => {
  const stripe = stripeClient();
  const { course, purchase } = await preparePurchase(req.id, req.body.courseId, 'stripe');
  let session;
  if (!purchase.paymentId.startsWith('pending_')) {
    session = await stripe.checkout.sessions.retrieve(purchase.paymentId);
    if (session.status === 'expired') {
      await CoursePurchase.updateOne({ _id: purchase._id, status: 'pending' }, { $set: { status: 'failed' } });
      throw new AppError('Checkout expired; start a new checkout', 409);
    }
    if (session.status !== 'open') throw new AppError('Payment is processing; check purchase status', 409);
  } else {
    session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'], mode: 'payment',
      line_items: [{ price_data: { currency: 'inr', product_data: { name: purchase.metadata?.get('courseTitle') || course.title }, unit_amount: minorUnits(purchase.amount) }, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL}/course-progress/${course._id}`,
      cancel_url: `${process.env.CLIENT_URL}/course-detail/${course._id}`,
      metadata: { courseId: String(course._id), userId: req.id, purchaseId: String(purchase._id) },
    }, { idempotencyKey: String(purchase._id) });
    purchase.paymentId = session.id;
    await purchase.save();
  }
  if (!session.url) throw new AppError('Checkout is unavailable', 502);
  res.json({ success: true, data: { checkoutUrl: session.url } });
});
export const handleStripeWebhook = catchAsync(async (req, res) => {
  const stripe = stripeClient();
  if (!process.env.STRIPE_WEBHOOK_SECRET) throw new AppError('Stripe webhook is not configured', 503);
  let event;
  try { event = stripe.webhooks.constructEvent(req.body, req.get('stripe-signature'), process.env.STRIPE_WEBHOOK_SECRET); }
  catch { throw new AppError('Invalid webhook signature', 400); }
  if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
    const session = event.data.object;
    if (session.payment_status === 'paid' && session.mode === 'payment') {
      const purchase = await CoursePurchase.findOne({ paymentId: session.id, paymentMethod: 'stripe' });
      if (!purchase) throw new AppError('Purchase is not yet available; retry webhook', 503);
      verifyAmount(purchase, session.amount_total, session.currency);
      if (session.metadata?.userId !== String(purchase.user) || session.metadata?.courseId !== String(purchase.course)) throw new AppError('Payment metadata does not match the order', 400);
      await fulfillPurchase(purchase._id);
    }
  }
  if (event.type === 'checkout.session.expired') await CoursePurchase.updateOne({ paymentId: event.data.object.id, paymentMethod: 'stripe', status: 'pending' }, { $set: { status: 'failed' } });
  res.json({ received: true });
});
export const getCoursePurchaseStatus = catchAsync(async (req, res) => {
  const course = await Course.findById(req.params.courseId).populate('instructor', 'name avatar bio').populate('lectures');
  if (!course) throw new AppError('Course not found', 404);
  const purchased = await CoursePurchase.exists({ user: req.id, course: course._id, status: 'completed' });
  const data = await courseView(course, req.id, Boolean(purchased));
  res.json({ success: true, data: { course: data, isPurchased: Boolean(purchased) } });
});
export const getPurchasedCourses = catchAsync(async (req, res) => {
  const page = Number(req.query.page || 1), limit = Number(req.query.limit || 20);
  const purchases = await CoursePurchase.find({ user: req.id, status: 'completed' }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate({ path: 'course', select: 'title thumbnail description category instructor totalLectures totalDuration level', populate: { path: 'instructor', select: 'name avatar' } });
  res.json({ success: true, data: purchases.map(p => p.course).filter(Boolean) });
});
