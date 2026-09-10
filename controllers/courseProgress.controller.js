import mongoose from 'mongoose';
import { CourseProgress } from '../models/courseProgress.js';
import { Course } from '../models/course.model.js';
import { AppError, catchAsync } from '../middleware/error.middleware.js';
import { hasCourseAccess, courseView } from '../services/courseAccess.js';
async function accessibleCourse(req) {
  const course = await Course.findById(req.params.courseId).populate('lectures');
  if (!course) throw new AppError('Course not found', 404);
  if (!await hasCourseAccess(course, req.id)) throw new AppError('Purchase this course to access progress', 403);
  return course;
}
export function summarizeProgress(course, progress) {
  const completed = new Set((progress?.lectureProgress || []).filter(p => p.isCompleted).map(p => String(p.lecture)));
  const total = course.lectures.length;
  const count = course.lectures.filter(l => completed.has(String(l._id || l))).length;
  return { isCompleted: total > 0 && count === total, completionPercentage: total ? Math.round(count / total * 100) : 0 };
}
export const getUserCourseProgress = catchAsync(async (req, res) => {
  const course = await accessibleCourse(req);
  const progress = await CourseProgress.findOne({ course: course._id, user: req.id });
  res.json({ success: true, data: { courseDetails: await courseView(course, req.id, true), progress: progress?.lectureProgress || [], ...summarizeProgress(course, progress) } });
});
async function updateProgress(req, mode) {
  const course = await accessibleCourse(req);
  if (mode === 'lecture' && !course.lectures.some(l => String(l._id) === req.params.lectureId)) throw new AppError('Lecture does not belong to this course', 404);
  const filter = { course: course._id, user: req.id };
  try { await CourseProgress.updateOne(filter, { $setOnInsert: { ...filter } }, { upsert: true }); }
  catch (error) { if (error.code !== 11000) throw error; }
  let result;
  await mongoose.connection.transaction(async session => {
    const progress = await CourseProgress.findOne(filter).session(session);
    const previous = new Map(progress.lectureProgress.map(p => [String(p.lecture), p]));
    progress.lectureProgress = course.lectures.map(lecture => {
      const old = previous.get(String(lecture._id));
      return { lecture: lecture._id, isCompleted: mode === 'complete' || (mode !== 'reset' && (old?.isCompleted || String(lecture._id) === req.params.lectureId)), watchTime: mode === 'reset' ? 0 : old?.watchTime || 0 };
    });
    Object.assign(progress, summarizeProgress(course, progress));
    progress.lastAccessed = new Date();
    await progress.save({ session });
    result = progress;
  });
  return result;
}
export const updateLectureProgress = catchAsync(async (req, res) => res.json({ success: true, data: await updateProgress(req, 'lecture') }));
export const markCourseAsCompleted = catchAsync(async (req, res) => res.json({ success: true, data: await updateProgress(req, 'complete') }));
export const resetCourseProgress = catchAsync(async (req, res) => res.json({ success: true, data: await updateProgress(req, 'reset') }));
