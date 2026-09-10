import '../config/env.js';
import mongoose from 'mongoose';
import { User } from '../models/user.model.js';
import { Course } from '../models/course.model.js';
import { Lecture } from '../models/lecture.model.js';
import { CoursePurchase } from '../models/coursePurchase.model.js';
import { CourseProgress } from '../models/courseProgress.js';
try {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false, serverSelectionTimeoutMS: 5000 });
  // Add missing indexes only; never drop indexes or automatically delete duplicate records.
  for (const model of [User, Course, Lecture, CoursePurchase, CourseProgress]) await model.createIndexes();
  console.log('Required database indexes are ready');
} catch (error) {
  console.error(`Index creation failed (${error.code || error.name}); inspect duplicates and connectivity before retrying`);
  process.exitCode = 1;
} finally { await mongoose.disconnect(); }
