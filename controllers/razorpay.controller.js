import Razorpay from 'razorpay';
import { CoursePurchase } from '../models/coursePurchase.model.js';
import { AppError, catchAsync } from '../middleware/error.middleware.js';
import { preparePurchase, minorUnits, verifyAmount, validSignature, fulfillPurchase } from '../services/purchase.js';
export function razorpayClient() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) throw new AppError('Razorpay payments are not configured', 503);
  const client = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
  client.api.rq.defaults.timeout = 10000;
  return client;
}
export const createRazorpayOrder = catchAsync(async (req, res) => {
  const razorpay = razorpayClient();
  const { course, purchase, fresh } = await preparePurchase(req.id, req.body.courseId, 'razorpay');
  let order;
  if (!purchase.paymentId.startsWith('pending_')) order = await razorpay.orders.fetch(purchase.paymentId);
  else {
    if (!fresh) throw new AppError('Order creation is pending; contact support before retrying', 409);
    order = await razorpay.orders.create({ amount: minorUnits(purchase.amount), currency: 'INR', receipt: String(purchase._id), notes: { courseId: String(course._id), userId: req.id } });
    purchase.paymentId = order.id;
    await purchase.save();
  }
  res.json({ success: true, keyId: process.env.RAZORPAY_KEY_ID, order, course: { name: course.title, description: course.description, image: course.thumbnail } });
});
export const verifyPayment = catchAsync(async (req, res) => {
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
  if (typeof orderId !== 'string' || typeof paymentId !== 'string' || !/^order_[a-zA-Z0-9]+$/.test(orderId) || !/^pay_[a-zA-Z0-9]+$/.test(paymentId)) throw new AppError('Invalid payment identifiers', 400);
  const razorpay = razorpayClient();
  const purchase = await CoursePurchase.findOne({ paymentId: orderId, user: req.id, paymentMethod: 'razorpay' });
  if (!purchase) throw new AppError('Purchase not found', 404);
  if (!validSignature(`${purchase.paymentId}|${paymentId}`, signature, process.env.RAZORPAY_KEY_SECRET)) throw new AppError('Invalid payment signature', 400);
  const payment = await razorpay.payments.fetch(paymentId);
  if (payment.order_id !== purchase.paymentId || payment.status !== 'captured') throw new AppError('Payment has not been captured', 409);
  verifyAmount(purchase, payment.amount, payment.currency);
  await fulfillPurchase(purchase._id);
  res.json({ success: true, message: 'Payment verified successfully', courseId: purchase.course });
});
export const handleRazorpayWebhook = catchAsync(async (req, res) => {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) throw new AppError('Razorpay webhook is not configured', 503);
  if (!Buffer.isBuffer(req.body) || !validSignature(req.body, req.get('x-razorpay-signature'), process.env.RAZORPAY_WEBHOOK_SECRET)) throw new AppError('Invalid webhook signature', 400);
  let event;
  try { event = JSON.parse(req.body.toString('utf8')); } catch { throw new AppError('Invalid webhook payload', 400); }
  if (event.event === 'payment.captured') {
    const payment = event.payload?.payment?.entity;
    if (!payment || typeof payment.order_id !== 'string' || payment.status !== 'captured') throw new AppError('Invalid captured payment', 400);
    const purchase = await CoursePurchase.findOne({ paymentId: payment.order_id, paymentMethod: 'razorpay' });
    if (!purchase) throw new AppError('Purchase is not yet available; retry webhook', 503);
    verifyAmount(purchase, payment.amount, payment.currency);
    await fulfillPurchase(purchase._id);
  }
  res.json({ received: true });
});
