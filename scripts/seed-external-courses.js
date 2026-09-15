import 'dotenv/config';
import mongoose from 'mongoose';
import { readFile } from 'node:fs/promises';
import { Course } from '../models/course.model.js';
import { User } from '../models/user.model.js';

// Operator-only import of the reviewed links. Never exposed as a public API.
const account = process.argv[2];
if (!account) { console.error('Usage: npm run courses:external -- <existing-account-email-or-id>'); process.exit(1); }
try {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  const user = await User.findOne(mongoose.isObjectIdOrHexString(account) ? { _id: account } : { email: account.toLowerCase() });
  if (!user) throw new Error('Account not found');
  const entries = JSON.parse(await readFile(new URL('./data/external-courses.json', import.meta.url), 'utf8'));
  const added = await mongoose.connection.transaction(async session => {
    let count = 0;
    for (const entry of entries) {
      if (await Course.exists({ externalUrl: entry.externalUrl }).session(session)) continue;
      const [course] = await Course.create([{ ...entry, instructor: user._id, isPublished: true }], { session });
      await User.updateOne({ _id: user._id }, { $addToSet: { createdCourses: course._id } }, { session });
      count++;
    }
    return count;
  });
  console.log(`Published ${added} external courses. Existing links were left unchanged.`);
} catch { console.error('Could not import courses. Check the account, environment and database connectivity.'); process.exitCode = 1; }
finally { await mongoose.disconnect(); }
