import mongoose from 'mongoose';
import crypto from 'node:crypto';
import { Course } from '../models/course.model.js';
import { CoursePurchase } from '../models/coursePurchase.model.js';
import { User } from '../models/user.model.js';
import { AppError } from '../middleware/error.middleware.js';
export function minorUnits(amount) {
  const value = Math.round(amount * 100);
  if (typeof amount !== 'number' || !Number.isSafeInteger(value) || value <= 0 || Math.abs(amount * 100 - value) > 0.00001) throw new AppError('Course price must be positive with at most two decimal places', 400);
  return value;
}
export async function preparePurchase(userId, courseId, provider) {
  if (!mongoose.isObjectIdOrHexString(courseId)) throw new AppError('Invalid course ID', 400);
  const course = await Course.findById(courseId);
  if (!course || !course.isPublished) throw new AppError('Course not found', 404);
  if (String(course.instructor) === userId || await CoursePurchase.exists({ user: userId, course: courseId, status: 'completed' })) throw new AppError('You already have access to this course', 409);
  minorUnits(course.price);
  let purchase = await CoursePurchase.findOne({ user: userId, course: courseId, status: 'pending' });
  if (purchase && purchase.paymentMethod !== provider) throw new AppError('A checkout with another provider is pending', 409);
  const fresh = !purchase;
  if (!purchase) purchase = await CoursePurchase.create({ user: userId, course: courseId, amount: course.price, currency: 'INR', paymentMethod: provider, paymentId: `pending_${crypto.randomUUID()}`, metadata: { courseTitle: course.title } });
  return { course, purchase, fresh };
}
export function verifyAmount(purchase, amount, currency) {
  if (amount !== minorUnits(purchase.amount) || currency?.toUpperCase() !== purchase.currency) throw new AppError('Payment amount or currency does not match the order', 400);
}
export function validSignature(payload, signature, secret) {
  if (!secret || typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest();
  return crypto.timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}
export async function fulfillPurchase(purchaseId) {
  // All three writes commit together. Duplicate callbacks become no-ops.
  await mongoose.connection.transaction(async session => {
    const purchase = await CoursePurchase.findById(purchaseId).session(session);
    if (!purchase) throw new AppError('Purchase not found', 404);
    if (purchase.status === 'completed') return;
    if (purchase.status !== 'pending') throw new AppError('Purchase cannot be fulfilled', 409);
    const course = await Course.findById(purchase.course).session(session);
    const user = await User.findById(purchase.user).session(session);
    if (!course || !user) throw new AppError('Purchase requires manual reconciliation', 409);
    await User.updateOne({ _id: user._id, 'enrolledCourses.course': { $ne: course._id } }, { $push: { enrolledCourses: { course: course._id } } }, { session });
    await Course.updateOne({ _id: course._id }, { $addToSet: { enrolledStudents: user._id } }, { session });
    purchase.status = 'completed';
    await purchase.save({ session });
  });
}
