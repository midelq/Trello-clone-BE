import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Lazy initialization
let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (_db) return _db;

  // Get database connection string from environment variables
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Create postgres client
  const client = postgres(connectionString, {
    max: 10, // Maximum number of connections
    idle_timeout: 20,
    connect_timeout: 10
  });

  // Create drizzle instance
  _db = drizzle(client, { schema });
  return _db;
}

// Export db getter
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_, prop) {
    return (getDb() as any)[prop];
  }
});

// Export schema for use in other files
export { schema };

