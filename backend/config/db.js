const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (mongoose.connection.readyState >= 1) {
      return mongoose.connection;
    }
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) {
      if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
        console.warn('WARNING: MONGO_URI not set, using default localhost dev DB');
        // Default local MongoDB instance for development
        const defaultUri = 'mongodb://127.0.0.1:27017/fpo_dev';
        return mongoose.connect(defaultUri, { serverSelectionTimeoutMS: 15000 });
      } else {
        throw new Error('MONGO_URI or MONGODB_URI environment variable is missing.');
      }
    }
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    // In development/test, log but don't kill the process so the server stays alive
    console.warn('Server will continue running without database connectivity.');
    console.warn('Login and other DB-dependent features will fail until MongoDB is reachable.');
  }
};

module.exports = connectDB;
