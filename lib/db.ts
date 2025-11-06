// ====================================
// lib/db.ts - Database Connection
// ====================================
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/invoxv2';

if (!MONGODB_URI) {
  throw new Error('Please define MONGODB_URI in .env.local');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      connectTimeoutMS: 10000,  // Reduce timeout to 10 seconds
      socketTimeoutMS: 45000,   // Socket timeout
      maxPoolSize: 10,          // Maximum number of connections
      minPoolSize: 5,           // Minimum number of connections
      serverSelectionTimeoutMS: 10000, // Server selection timeout
      heartbeatFrequencyMS: 1000,    // More frequent heartbeats
    };

    console.log('Connecting to MongoDB...', { uri: MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//<user>:<pass>@') });

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('MongoDB connection established');
      return mongoose.connection;
    });
  }

  try {
    cached.conn = await cached.promise;
    console.log('MongoDB connection retrieved from cache');
  } catch (error: unknown) {
    console.error('MongoDB connection error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: error instanceof mongoose.Error ? (error as any).code : undefined,
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
    });
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

export default dbConnect;
