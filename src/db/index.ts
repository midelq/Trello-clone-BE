import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

import { env } from '../config/env';

// Lazy initialization
let _db: ReturnType<typeof drizzle> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

function getDb() {
  if (_db) return _db;

  // Get database connection string from environment variables
  // Zod guarantees DATABASE_URL exists and is a valid URL
  const connectionString = env.DATABASE_URL;

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

