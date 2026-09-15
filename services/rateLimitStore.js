import mongoose from 'mongoose';
import { createHash } from 'node:crypto';

// Expiry is encoded in the key; the TTL index only cleans up old windows.
export class MongoRateLimitStore {
  constructor(prefix) { this.prefix = prefix; this.localKeys = false; }
  init({ windowMs }) { this.windowMs = windowMs; }
  async increment(key) {
    const window = Math.floor(Date.now() / this.windowMs);
    const resetTime = new Date((window + 1) * this.windowMs);
    const hash = createHash('sha256').update(key).digest('hex');
    const _id = `${this.prefix}:${window}:${hash}`;
    const collection = mongoose.connection.db.collection('ratelimits');
    const options = { upsert: true, returnDocument: 'after', includeResultMetadata: false };
    let record;
    try {
      record = await collection.findOneAndUpdate({ _id }, { $inc: { totalHits: 1 }, $setOnInsert: { expiresAt: resetTime } }, options);
    } catch (error) {
      if (error.code !== 11000) throw error;
      record = await collection.findOneAndUpdate({ _id }, { $inc: { totalHits: 1 } }, { ...options, upsert: false });
    }
    return { totalHits: record.totalHits, resetTime };
  }
  async decrement() {}
  async resetKey() {}
}
export const sharedRateLimit = (prefix) => process.env.NODE_ENV === 'production'
  ? { store: new MongoRateLimitStore(prefix) } : {};
