import { CoursePurchase } from '../models/coursePurchase.model.js';
import { AppError } from '../middleware/error.middleware.js';
import { videoDeliveryUrl } from '../utils/cloudinary.js';
export const isOwner = (course, userId) => String(course.instructor?._id || course.instructor) === String(userId);
export async function hasCourseAccess(course, userId) {
  if (!userId) return false;
  return isOwner(course, userId) || Boolean(await CoursePurchase.exists({ course: course._id, user: userId, status: 'completed' }));
}
export async function courseView(course, userId, purchased) {
  const owner = isOwner(course, userId);
  const access = owner || (purchased ?? await hasCourseAccess(course, userId));
  if (!course.isPublished && !access) throw new AppError('Course not found', 404);
  const data = course.toJSON();
  delete data.enrolledStudents;
  data.lectures = (course.lectures || []).map(lecture => {
    const item = lecture.toJSON ? lecture.toJSON() : { ...lecture };
    delete item.videoUrl; delete item.publicId;
    if (access || (course.isPublished && lecture.isPreview)) item.videoUrl = videoDeliveryUrl(lecture);
    return item;
  });
  return data;
}
