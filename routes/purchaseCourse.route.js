import mongoose from "mongoose";
import { AppError } from "../middleware/error.middleware.js";
import express from "express";
import {
  getCoursePurchaseStatus,
  getPurchasedCourses,
  initiateStripeCheckout,
} from "../controllers/coursePurchase.controller.js";
import { isAuthenticated } from "../middleware/auth.middleware.js";

const router = express.Router();
for (const field of ['courseId', 'lectureId']) router.param(field, (req, res, next, value) => {
  if (!mongoose.isObjectIdOrHexString(value)) return next(new AppError('Invalid resource ID', 400));
  next();
});

router
  .route("/checkout/create-checkout-session")
  .post(isAuthenticated, initiateStripeCheckout);
router
  .route("/course/:courseId/detail-with-status")
  .get(isAuthenticated, getCoursePurchaseStatus);

router.route("/").get(isAuthenticated, getPurchasedCourses);

export default router;
