import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDatabase() {
  if (!env.MONGODB_URI) {
    console.warn('MONGODB_URI is not configured; API is running without a database connection.');
    return false;
  }
  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: env.NODE_ENV === 'production' ? 20 : 10,
    minPoolSize: env.NODE_ENV === 'production' ? 2 : 0,
    autoIndex: env.NODE_ENV !== 'production',
  });
  console.info('MongoDB connected.');
  return true;
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}

export function getDatabaseStatus() {
  const labels = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return env.MONGODB_URI ? labels[mongoose.connection.readyState] || 'unknown' : 'not configured';
}
