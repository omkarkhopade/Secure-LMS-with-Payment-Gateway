import mongoose from "mongoose";
import { courseView, hasCourseAccess, isOwner } from "../services/courseAccess.js";
import { Course } from "../models/course.model.js";
import { Lecture } from "../models/lecture.model.js";
import { User } from "../models/user.model.js";
import { deleteMediaFromCloudinary, uploadMedia } from "../utils/cloudinary.js";
import { catchAsync } from "../middleware/error.middleware.js";
import { AppError } from "../middleware/error.middleware.js";

/**
 * Create a new course
 * @route POST /api/v1/courses
 */
export const createNewCourse = catchAsync(async (req, res) => {
  const { title, subtitle, description, category, level, price, isPublished } = req.body;

  // Handle thumbnail upload
  let thumbnail, thumbnailPublicId;
  if (req.file) {
    const result = await uploadMedia(req.file.path);
    thumbnail = result.secure_url;
    thumbnailPublicId = result.public_id;
  } else{
    throw new AppError("Course thumbnail is required", 400);
  }

  let course;
  await mongoose.connection.transaction(async session => {
    [course] = await Course.create([{ title, subtitle, description, category, level, price, thumbnail, thumbnailPublicId, instructor: req.id }], { session });
    await User.updateOne({ _id: req.id }, { $addToSet: { createdCourses: course._id } }, { session });
  });

  res.status(201).json({
    success: true,
    message: "Course created successfully",
    data: course,
  });
});

/**
 * Search courses with filters
 * @route GET /api/v1/courses/search
 */
export const searchCourses = catchAsync(async (req, res) => {
  const {

    query = "",
    categories = [],
    level,
    priceRange,
    sortBy = "newest",
    
  } = req.query;

  const escapedQuery = query.slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Create search query
  const searchCriteria = {
    isPublished: true,
    $or: [
      { title: { $regex: escapedQuery, $options: "i" } },
      { subtitle: { $regex: escapedQuery, $options: "i" } },
      { description: { $regex: escapedQuery, $options: "i" } },
    ],
  };

  // Apply filters
  if (categories.length > 0) {
    searchCriteria.category = { $in: Array.isArray(categories) ? categories : categories.split(",") };
  }
  if (level) {
    searchCriteria.level = level;
  }
  if (priceRange) {
    if (!/^\d+(?:\.\d{1,2})?-\d+(?:\.\d{1,2})?$/.test(priceRange)) throw new AppError("Invalid price range", 400);
    const [min, max] = priceRange.split("-").map(Number);
    if (min > max) throw new AppError("Invalid price range", 400);
    searchCriteria.price = { $gte: min, $lte: max };
  }

  // Define sorting
  const sortOptions = {};
  switch (sortBy) {
    case "price-low":
      sortOptions.price = 1;
      break;
    case "price-high":
      sortOptions.price = -1;
      break;
    case "oldest":
      sortOptions.createdAt = 1;
      break;
    default:
      sortOptions.createdAt = -1;
  }

  const courses = await Course.find(searchCriteria)
    .populate({
      path: "instructor",
      select: "name avatar",
    })
    .select("-enrolledStudents")
    .maxTimeMS(5000).sort(sortOptions).skip((Number(req.query.page || 1) - 1) * Number(req.query.limit || 20)).limit(Number(req.query.limit || 20));

  res.status(200).json({
    success: true,
    count: courses.length,
    data: courses,
  });
});

/**
 * Get all published courses
 * @route GET /api/v1/courses/published
 */
export const getPublishedCourses = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [courses, total] = await Promise.all([
    Course.find({ isPublished: true }).select("-enrolledStudents")
      .populate({
        path: "instructor",
        select: "name avatar",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Course.countDocuments({ isPublished: true }),
  ]);

  res.status(200).json({
    success: true,
    data: courses,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * Get courses created by the current user
 * @route GET /api/v1/courses/my-courses
 */
export const getMyCreatedCourses = catchAsync(async (req, res) => {
  const courses = await Course.find({ instructor: req.id }).skip((Number(req.query.page || 1) - 1) * Number(req.query.limit || 20)).limit(Number(req.query.limit || 20)).populate({
    path: "enrolledStudents",
    select: "name avatar",
  });

  res.status(200).json({
    success: true,
    count: courses.length,
    data: courses,
  });
});

/**
 * Update course details
 * @route PATCH /api/v1/courses/:courseId
 */
export const updateCourseDetails = catchAsync(async (req, res) => {
  const { courseId } = req.params;
  const { title, subtitle, description, category, level, price, isPublished } = req.body;

  const course = await Course.findById(courseId);
  if (!course) {
    throw new AppError("Course not found", 404);
  }

  // Verify ownership
  if (course.instructor.toString() !== req.id) {
    throw new AppError("Not authorized to update this course", 403);
  }

  // Handle thumbnail upload
  let thumbnail, thumbnailPublicId;
  if (req.file) {
    const result = await uploadMedia(req.file.path);
    thumbnail = result.secure_url;
    thumbnailPublicId = result.public_id;
  }

  const updatedCourse = await Course.findByIdAndUpdate(
    courseId,
    {
      title,
      subtitle,
      description,
      category,
      level,
      price,
      ...(isPublished !== undefined && { isPublished }),
      ...(thumbnail && { thumbnail, thumbnailPublicId }),
    },
    { new: true, runValidators: true }
  );

  if (thumbnail && course.thumbnailPublicId) await deleteMediaFromCloudinary(course.thumbnailPublicId).catch(() => console.error("Old thumbnail cleanup failed"));

  res.status(200).json({
    success: true,
    message: "Course updated successfully",
    data: updatedCourse,
  });
});

/**
 * Get course by ID
 * @route GET /api/v1/courses/:courseId
 */
export const getCourseDetails = catchAsync(async (req, res) => {
  const course = await Course.findById(req.params.courseId)
    .populate({
      path: "instructor",
      select: "name avatar bio",
    })
    .populate({
      path: "lectures",
      select: "title videoUrl publicId videoFormat duration isPreview order",
    });

  if (!course) {
    throw new AppError("Course not found", 404);
  }

  res.status(200).json({
    success: true,
    data: await courseView(course, req.id),
  });
});

/**
 * Add lecture to course
 * @route POST /api/v1/courses/:courseId/lectures
 */
export const addLectureToCourse = catchAsync(async (req, res) => {
  const { title, description, isPreview } = req.body;
  const { courseId } = req.params;

  // Get course and verify ownership
  const course = await Course.findById(courseId);
  if (!course) {
    throw new AppError("Course not found", 404);
  }
  if (course.instructor.toString() !== req.id) {
    throw new AppError("Not authorized to update this course", 403);
  }

  // Handle video upload
  if (!req.file) {
    throw new AppError("Video file is required", 400);
  }

  // Upload video to cloudinary
  const result = await uploadMedia(req.file.path, "video");
  if (!result) {
    throw new AppError("Error uploading video", 500);
  }

  let lecture;
  await mongoose.connection.transaction(async session => {
    const current = await Course.findById(courseId).session(session);
    [lecture] = await Lecture.create([{
      title, description, isPreview, order: current.lectures.length + 1,
      videoUrl: result.secure_url, publicId: result.public_id, videoFormat: result.format,
      duration: result.duration || 0,
    }], { session });
    current.lectures.push(lecture._id);
    current.totalDuration += lecture.duration;
    await current.save({ session });
  });

  res.status(201).json({
    success: true,
    message: "Lecture added successfully",
    data: lecture,
  });
});

/**
 * Get course lectures
 * @route GET /api/v1/courses/:courseId/lectures
 */
export const getCourseLectures = catchAsync(async (req, res) => {
  const course = await Course.findById(req.params.courseId).populate({
    path: "lectures",
    select: "title description videoUrl publicId videoFormat duration isPreview order",
    options: { sort: { order: 1 } },
  });

  if (!course) {
    throw new AppError("Course not found", 404);
  }

  const data = await courseView(course, req.id);
  res.json({ success: true, data: { lectures: data.lectures, isEnrolled: await hasCourseAccess(course, req.id), isInstructor: isOwner(course, req.id) } });
});
