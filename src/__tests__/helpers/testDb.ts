import { sql } from 'drizzle-orm';
import { db } from '../../db';


export async function cleanDatabase(): Promise<void> {
  try {
    
    await db.execute(sql`TRUNCATE TABLE activities, cards, lists, boards, users RESTART IDENTITY CASCADE`);
  } catch (error) {
    console.error('Error cleaning database:', error);
    throw error;
  }
}


export async function checkTestDbConnection(): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1`);
    return true;
  } catch (error) {
    console.error('Test database connection failed:', error);
    return false;
  }
}


export async function closeDbConnection(): Promise<void> {
  try {
   
    console.log('Test database connections closed');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
}

