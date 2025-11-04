import dotenv from 'dotenv';
dotenv.config();

import { db } from '../db';
import { sql } from 'drizzle-orm';

async function clearDatabase() {
  try {
    console.log('clear database...');
    console.log('');

    await db.execute(sql`
      TRUNCATE TABLE users, boards, lists, cards, activities 
      RESTART IDENTITY CASCADE;
    `);

  
    console.log('clear database success');
   
    
    
    process.exit(0);
  } catch (error) {
    
    console.error('error clear database:', error);
    
    process.exit(1);
  }
}

clearDatabase();

