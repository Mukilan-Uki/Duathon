import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDatabase() {
  if (!env.MONGODB_URI) {
    console.warn('MONGODB_URI is not configured; API is running without a database connection.');
    return false;
  }

  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: env.NODE_ENV === 'production' ? 30000 : 15000,
      maxPoolSize: env.NODE_ENV === 'production' ? 20 : 10,
      minPoolSize: env.NODE_ENV === 'production' ? 2 : 0,
      autoIndex: false,
    });

    if (env.NODE_ENV === 'production') {
      await syncIndexes();
    }

    console.info('MongoDB connected.');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (env.NODE_ENV === 'production') {
      console.error('Production MongoDB connection failed.', message);
      throw error;
    }

    console.warn('MongoDB connection failed; continuing without a database connection.', message);
    return false;
  }
}

async function syncIndexes() {
  const models = Object.values(mongoose.connection.models);
  for (const model of models) {
    await model.syncIndexes();
  }
  console.info(`Synced indexes for ${models.length} model(s).`);
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}

export function getDatabaseStatus() {
  const labels = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return env.MONGODB_URI ? labels[mongoose.connection.readyState] || 'unknown' : 'not configured';
}
