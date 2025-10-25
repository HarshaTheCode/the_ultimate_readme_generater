import { Db, Collection } from 'mongodb';
import { User, ReadmeCache, COLLECTIONS } from '@/types/database';

// MongoDB schema validation rules
const userSchema = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['githubId', 'username', 'avatar_url', 'accessToken', 'createdAt', 'lastLoginAt'],
    properties: {
      githubId: {
        bsonType: 'number',
        description: 'GitHub user ID must be a number and is required'
      },
      username: {
        bsonType: 'string',
        description: 'Username must be a string and is required'
      },
      email: {
        bsonType: ['string', 'null'],
        description: 'Email must be a string or null'
      },
      avatar_url: {
        bsonType: 'string',
        description: 'Avatar URL must be a string and is required'
      },
      accessToken: {
        bsonType: 'string',
        description: 'Access token must be a string and is required'
      },
      createdAt: {
        bsonType: 'date',
        description: 'Created date must be a date and is required'
      },
      lastLoginAt: {
        bsonType: 'date',
        description: 'Last login date must be a date and is required'
      }
    }
  }
};

const readmeCacheSchema = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['userId', 'repositoryId', 'repositoryFullName', 'markdown', 'metadata', 'generatedAt', 'expiresAt'],
    properties: {
      userId: {
        bsonType: 'objectId',
        description: 'User ID must be an ObjectId and is required'
      },
      repositoryId: {
        bsonType: 'number',
        description: 'Repository ID must be a number and is required'
      },
      repositoryFullName: {
        bsonType: 'string',
        description: 'Repository full name must be a string and is required'
      },
      markdown: {
        bsonType: 'string',
        description: 'Markdown content must be a string and is required'
      },
      metadata: {
        bsonType: 'object',
        description: 'Metadata must be an object and is required'
      },
      generatedAt: {
        bsonType: 'date',
        description: 'Generated date must be a date and is required'
      },
      expiresAt: {
        bsonType: 'date',
        description: 'Expiration date must be a date and is required'
      }
    }
  }
};

// Initialize database collections with schema validation and indexes
export async function initializeDatabase(db: Db): Promise<void> {
  try {
    // Create users collection with schema validation
    await createCollectionWithSchema(db, COLLECTIONS.USERS, userSchema);
    
    // Create readme_cache collection with schema validation
    await createCollectionWithSchema(db, COLLECTIONS.README_CACHE, readmeCacheSchema);
    
    // Create indexes for performance
    await createIndexes(db);
    
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

// Helper function to create collection with schema validation
async function createCollectionWithSchema(db: Db, collectionName: string, schema: any): Promise<void> {
  try {
    // Check if collection already exists
    const collections = await db.listCollections({ name: collectionName }).toArray();
    
    if (collections.length === 0) {
      // Create collection with schema validation
      await db.createCollection(collectionName, {
        validator: schema
      });
      console.log(`Created collection: ${collectionName}`);
    } else {
      // Update existing collection with schema validation
      await db.command({
        collMod: collectionName,
        validator: schema
      });
      console.log(`Updated schema for collection: ${collectionName}`);
    }
  } catch (error) {
    console.error(`Error creating/updating collection ${collectionName}:`, error);
    throw error;
  }
}

// Create database indexes for performance optimization
async function createIndexes(db: Db): Promise<void> {
  try {
    const usersCollection = db.collection<User>(COLLECTIONS.USERS);
    const readmeCacheCollection = db.collection<ReadmeCache>(COLLECTIONS.README_CACHE);
    
    // Users collection indexes
    await usersCollection.createIndex({ githubId: 1 }, { unique: true });
    await usersCollection.createIndex({ username: 1 });
    await usersCollection.createIndex({ lastLoginAt: -1 });
    
    // README cache collection indexes
    await readmeCacheCollection.createIndex({ userId: 1 });
    await readmeCacheCollection.createIndex({ repositoryId: 1 });
    await readmeCacheCollection.createIndex({ repositoryFullName: 1 });
    await readmeCacheCollection.createIndex({ userId: 1, repositoryId: 1 }, { unique: true });
    
    // TTL index for automatic expiration (30 days)
    await readmeCacheCollection.createIndex(
      { expiresAt: 1 }, 
      { expireAfterSeconds: 0 }
    );
    
    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error creating database indexes:', error);
    throw error;
  }
}

// Get typed collection helpers
export function getUsersCollection(db: Db): Collection<User> {
  return db.collection<User>(COLLECTIONS.USERS);
}

export function getReadmeCacheCollection(db: Db): Collection<ReadmeCache> {
  return db.collection<ReadmeCache>(COLLECTIONS.README_CACHE);
}