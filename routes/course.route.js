import mongoose from "mongoose";
import { AppError } from "../middleware/error.middleware.js";
import { validateCourse, validateLecture } from "../middleware/validation.middleware.js";
import express from "express";
import { isAuthenticated, restrictTo } from "../middleware/auth.middleware.js";
import {
  createNewCourse,
  searchCourses,
  getPublishedCourses,
  getMyCreatedCourses,
  updateCourseDetails,
  getCourseDetails,
  addLectureToCourse,
  getCourseLectures,
} from "../controllers/course.controller.js";
import upload from "../utils/multer.js";

const router = express.Router();
for (const field of ['courseId', 'lectureId']) router.param(field, (req, res, next, value) => {
  if (!mongoose.isObjectIdOrHexString(value)) return next(new AppError('Invalid resource ID', 400));
  next();
});

// Public routes
router.get("/published", getPublishedCourses);
router.get("/search", searchCourses);

// Protected routes
router.use(isAuthenticated);

// Course management
router
  .route("/")
  .post(restrictTo("instructor"), upload.single("thumbnail"), validateCourse(), createNewCourse)
  .get(restrictTo("instructor"), getMyCreatedCourses);

// Course details and updates
router
  .route("/c/:courseId")
  .get(getCourseDetails)
  .patch(
    restrictTo("instructor"),
    upload.single("thumbnail"),
    validateCourse(true),
    updateCourseDetails
  );

// Lecture management
router
  .route("/c/:courseId/lectures")
  .get(getCourseLectures)
  .post(restrictTo("instructor"), upload.single("video"), validateLecture, addLectureToCourse);

export default router;
