import { Course } from "../models/course.model.js";
import { User } from "../models/user.model.js";
import { generateToken, cookieOptions } from "../utils/generateToken.js";
import { deleteMediaFromCloudinary, uploadMedia } from "../utils/cloudinary.js";
import { catchAsync } from "../middleware/error.middleware.js";
import { AppError } from "../middleware/error.middleware.js";

/**
 * Create a new user account
 * @route POST /api/v1/users/signup
 */
export const createUserAccount = catchAsync(async (req, res) => {
  const { name, email, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new AppError("User already exists with this email", 400);
  }

  // Create user (password hashing is handled by the model)
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role: "student",
  });

  // Update last active and generate token
  await user.updateLastActive();
  generateToken(res, user, "Account created successfully");
});

/**
 * Authenticate user and get token
 * @route POST /api/v1/users/signin
 */
export const authenticateUser = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  // Find user and check password
  const user = await User.findOne({ email : email.toLowerCase() }).select(
    "+password"
  );
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError("Invalid email or password", 401);
  }

  // Update last active and generate token
  await user.updateLastActive();
  generateToken(res, user, `Welcome back ${user.name}`);
});

/**
 * Sign out user and clear cookie
 * @route POST /api/v1/users/signout
 */
export const signOutUser = catchAsync(async (_, res) => {
  res.clearCookie("token", cookieOptions());
  res.status(200).json({
    success: true,
    message: "Signed out successfully"
  });
});

/**
 * Get current user profile
 * @route GET /api/v1/users/profile
 */
export const getCurrentUserProfile = catchAsync(async (req, res) => {
  const user = await User.findById(req.id)
    .populate({
      path: "enrolledCourses.course",
      select: "title description thumbnail",
    })
    .populate({
      path: "createdCourses",
      select: "title thumbnail enrolledStudents",
    });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  res.status(200).json({
    success: true,
    data: {
      ...user.toJSON(),
      totalEnrolledCourses: user.totalEnrolledCourses,
    },
  });
});

/**
 * Update user profile
 * @route PATCH /api/v1/users/profile
 */
export const updateUserProfile = catchAsync(async (req, res) => {
  const { name, email, bio } = req.body;
  const updateData = { name, email: email?.toLowerCase(), bio };

  // Handle avatar upload if provided
  if (req.file) {
    const avatarResult = await uploadMedia(req.file.path);
    updateData.avatar = avatarResult.secure_url;
    updateData.avatarPublicId = avatarResult.public_id;


  }

  // Update user and get updated document
  const updatedUser = await User.findByIdAndUpdate(req.id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!updatedUser) {
    throw new AppError("User not found", 404);
  }

  if (req.file && req.user.avatarPublicId) await deleteMediaFromCloudinary(req.user.avatarPublicId).catch(() => console.error("Old avatar cleanup failed"));

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: updatedUser,
  });
});

/**
 * Change user password
 * @route PATCH /api/v1/users/password
 */
export const changeUserPassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await User.findById(req.id).select("+password");
  if (!user) {
    throw new AppError("User not found", 404);
  }

  // Verify current password
  if (!(await user.comparePassword(currentPassword))) {
    throw new AppError("Current password is incorrect", 401);
  }

  // Update password
  user.password = newPassword;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  generateToken(res, user, "Password changed successfully");
});

/**
 * Delete user account
 * @route DELETE /api/v1/users/account
 */
export const deleteUserAccount = catchAsync(async (req, res) => {
  const user = await User.findById(req.id);
  if (await Course.exists({ instructor: req.id })) throw new AppError("Transfer or archive owned courses before deleting this account", 409);

  // Delete avatar if not default
  if (user.avatar && user.avatar !== "default-avatar.png") {
    await deleteMediaFromCloudinary(user.avatarPublicId);
  }

  // Delete user
  await User.findByIdAndDelete(req.id);

  res.clearCookie("token", cookieOptions());
  res.status(200).json({
    success: true,
    message: "Account deleted successfully",
  });
});
