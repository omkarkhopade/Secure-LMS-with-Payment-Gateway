import { StartupError } from '../utils/startupError.js';
import mongoose from 'mongoose';
mongoose.set('strictQuery', true);
mongoose.set('bufferCommands', false);
let connecting;
export default function connectDB() {
  if (connecting) return connecting;
  connecting = initialize().catch(async error => {
    connecting = undefined;
    await mongoose.disconnect();
    throw error;
  });
  return connecting;
}
async function initialize() {
  await mongoose.connect(process.env.MONGO_URI, {
    maxPoolSize: 10, serverSelectionTimeoutMS: 5000, socketTimeoutMS: 45000,
    autoIndex: process.env.NODE_ENV !== 'production',
  });
  const topology = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!topology.setName && topology.msg !== 'isdbgrid') throw new StartupError('MongoDB must support transactions (replica set or Atlas)');
  if (process.env.NODE_ENV === 'production') {
    for (const [collection, name] of [['users', 'email_1'], ['coursepurchases', 'paymentMethod_1_paymentId_1'], ['coursepurchases', 'user_1_course_1_status_1'], ['courseprogresses', 'user_1_course_1']]) {
      const indexes = await mongoose.connection.db.collection(collection).listIndexes().toArray();
      if (!indexes.some(index => index.name === name && index.unique)) throw new StartupError('Required database indexes are missing; run npm run db:indexes');
    }
  }
  if (process.env.NODE_ENV === 'production') {
    const indexes = await mongoose.connection.db.collection('ratelimits').listIndexes().toArray();
    if (!indexes.some(index => index.name === 'expiresAt_1' && index.expireAfterSeconds === 0)) throw new StartupError('Rate-limit index missing; run npm run db:indexes');
  }
  return mongoose.connection;
}
export const getDBStatus = () => ({ isConnected: mongoose.connection.readyState === 1, readyState: mongoose.connection.readyState });
