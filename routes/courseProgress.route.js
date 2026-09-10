import mongoose from "mongoose";
import { AppError } from "../middleware/error.middleware.js";
import express from "express"
import { isAuthenticated } from "../middleware/auth.middleware.js";
import {
    getUserCourseProgress,
    updateLectureProgress,
    markCourseAsCompleted,
    resetCourseProgress
} from "../controllers/courseProgress.controller.js";

const router = express.Router();
for (const field of ['courseId', 'lectureId']) router.param(field, (req, res, next, value) => {
  if (!mongoose.isObjectIdOrHexString(value)) return next(new AppError('Invalid resource ID', 400));
  next();
});

// Get course progress
router.get("/:courseId", isAuthenticated, getUserCourseProgress);

// Update lecture progress
router.patch("/:courseId/lectures/:lectureId", isAuthenticated, updateLectureProgress);

// Mark course as completed
router.patch("/:courseId/complete", isAuthenticated, markCourseAsCompleted);

// Reset course progress
router.patch("/:courseId/reset", isAuthenticated, resetCourseProgress);

export default router;