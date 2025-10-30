import { MongoClient, Db } from 'mongodb';

// Check for MongoDB URI, but allow build-time to proceed without it
const uri = process.env.MONGODB_URI;
if (!uri && process.env.NODE_ENV !== 'development') {
  console.warn('MONGODB_URI environment variable is not set');
}
const options = {
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  tlsAllowInvalidCertificates: true, // Temporarily allow invalid certificates for debugging
  tlsAllowInvalidHostnames: true, // Temporarily allow invalid hostnames for debugging
};

let client: MongoClient;
let clientPromise: Promise<MongoClient> | undefined;

// Only initialize MongoDB connection if URI is available
if (uri) {
  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    let globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable.
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }
}

// Database connection helper with retry logic
export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (!uri) {
    throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
  }

  if (!clientPromise) {
    throw new Error('MongoDB client not initialized');
  }

  const maxRetries = 3;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const client = await clientPromise;
      const db = client.db(process.env.MONGODB_DB || 'readme-generator');
      
      // Test the connection
      await db.admin().ping();
      
      return { client, db };
    } catch (error) {
      retries++;
      console.error(`MongoDB connection attempt ${retries} failed:`, error);
      
      if (retries >= maxRetries) {
        throw new Error(`Failed to connect to MongoDB after ${maxRetries} attempts: ${error}`);
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
    }
  }
  
  throw new Error('Unexpected error in MongoDB connection');
}

// Get database instance
export async function getDatabase(): Promise<Db> {
  const { db } = await connectToDatabase();
  return db;
}

// Close connection (useful for cleanup in tests)
export async function closeConnection(): Promise<void> {
  try {
    if (clientPromise) {
      const client = await clientPromise;
      await client.close();
    }
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
  }
}

export default clientPromise;