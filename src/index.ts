import dotenv from 'dotenv';
dotenv.config();

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { db } from './db';
import { sql } from 'drizzle-orm';

const app: Application = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Welcome to Trello Clone API',
    version: '1.0.0',
    database: 'PostgreSQL with Drizzle ORM',
    endpoints: {
      health: '/health'
    }
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.url} not found`
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: any) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Database connection check
async function checkDatabaseConnection() {
  try {
    await db.execute(sql`SELECT 1`);
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  
  // Check database connection
  await checkDatabaseConnection();
});

export default app;

