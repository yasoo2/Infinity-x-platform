
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/joe_platform';

let dbInstance = null;

/**
 * Returns the Mongoose connection instance.
 * @returns {mongoose.Connection} The active Mongoose connection.
 */
export function getDB() {
  if (!dbInstance) {
    throw new Error('Database not connected. Call connectDB first.');
  }
  return dbInstance;
}

/**
 * Establishes the connection to the MongoDB database using Mongoose.
 */
export async function connectDB() {
  if (dbInstance) {
    console.log('✅ Database already connected.');
    return dbInstance;
  }

  try {
    // Set strictQuery to false to prepare for Mongoose 7+ default
    mongoose.set('strictQuery', false); 
    
    await mongoose.connect(MONGODB_URI, {
      // useNewUrlParser and useUnifiedTopology are default in Mongoose 6+
      // We keep them commented out for a modern Mongoose connection.
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });

    dbInstance = mongoose.connection;

    dbInstance.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    dbInstance.once('open', () => {
      console.log('✅ MongoDB connection successful.');
    });

    return dbInstance;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    throw error;
  }
}
