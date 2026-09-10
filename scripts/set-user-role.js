import '../config/env.js';
import mongoose from 'mongoose';
import { User } from '../models/user.model.js';
try {
  const [email, role] = process.argv.slice(2);
  if (!email || !['student', 'instructor', 'admin'].includes(role)) throw new Error('Usage: npm run user:role -- email role');
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false, serverSelectionTimeoutMS: 5000 });
  const result = await User.updateOne({ email: email.trim().toLowerCase() }, { $set: { role }, $inc: { tokenVersion: 1 } }, { runValidators: true });
  if (!result.matchedCount) throw new Error('User not found');
  console.log('User role updated; existing sessions revoked');
} catch (error) {
  console.error(error.message?.startsWith('Usage:') ? error.message : 'Role update failed; check the account and database configuration');
  process.exitCode = 1;
} finally { await mongoose.disconnect(); }
