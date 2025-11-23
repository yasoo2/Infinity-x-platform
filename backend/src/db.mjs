
/**
 * Mock Database System - In-Memory DB for Development
 * This is a temporary, non-persistent database replacement.
 * It allows other systems that depend on a database to function without crashing.
 * @version 1.0.0
 */

// This is an in-memory store. Data will be lost when the server restarts.
const mockDatabase = {
  joe_projects: {
    // Using a Map to better simulate a collection
    _data: new Map(),
    async insertOne(doc) {
      if (!doc._id) {
        throw new Error('Mock DB Error: Document must have an _id.');
      }
      this._data.set(doc._id, doc);
      console.log(`[MockDB] Document inserted in joe_projects: ${doc._id}`);
      return { acknowledged: true, insertedId: doc._id };
    },
    async findOne({ _id }) {
       console.log(`[MockDB] Searching for document in joe_projects: ${_id}`);
      return this._data.get(_id) || null;
    },
  },
  // Add other mock collections here as needed
};

let dbInstance = null;

/**
 * Returns a mock database instance.
 * This function mimics connecting to a real database but provides the in-memory object.
 */
export function getDB() {
  if (!dbInstance) {
    console.warn('⚠️ WARNING: Using a temporary In-Memory Mock Database. Data will NOT be saved permanently.');
    dbInstance = {
      collection: (name) => {
        if (!mockDatabase[name]) {
          console.warn(`[MockDB] Collection "${name}" does not exist. Creating it in-memory.`);
          mockDatabase[name] = {
            _data: new Map(),
            async insertOne(doc) { /* ... implementation ... */ },
            async findOne({ _id }) { /* ... implementation ... */ },
          };
        }
        return mockDatabase[name];
      },
    };
  }
  return dbInstance;
}

/**
 * This function is a placeholder and does not establish a real database connection.
 */
export async function connectDB() {
  console.log('✅ Mock Database System is ready.');
  // In a real scenario, this would connect to MongoDB, PostgreSQL, etc.
  return getDB();
}
