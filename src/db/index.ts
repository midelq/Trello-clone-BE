import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Lazy initialization
let _db: ReturnType<typeof drizzle> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

function getDb() {
  if (_db) return _db;

  // Get database connection string from environment variables
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Create postgres client
  _client = postgres(connectionString, {
    max: 10, // Maximum number of connections
    idle_timeout: 20,
    connect_timeout: 10
  });

  // Create drizzle instance
  _db = drizzle(_client, { schema });
  return _db;
}

import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

// ...

// Export db getter
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_, prop) {
    return (getDb() as any)[prop];
  }
});

// Close database connection (useful for tests and graceful shutdown)
export async function closeDatabase(): Promise<void> {
  if (_client) {
    await _client.end();
    _client = null;
    _db = null;
  }
}

// Export schema for use in other files
export { schema };

