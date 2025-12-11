import dotenv from 'dotenv';
dotenv.config();

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { db } from './db';
import { sql } from 'drizzle-orm';
import authRoutes from './routes/auth.routes';
import boardRoutes from './routes/board.routes';
import listRoutes from './routes/list.routes';
import cardRoutes from './routes/card.routes';

const app: Application = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Check if origin is allowed
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin); // Log blocked origins for debugging
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Explicitly handle OPTIONS requests for CORS preflight
app.options('*', cors({
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/lists', listRoutes);
app.use('/api/cards', cardRoutes);

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
      health: '/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me (protected)'
      },
      boards: {
        getAll: 'GET /api/boards (protected)',
        getById: 'GET /api/boards/:id (protected)',
        create: 'POST /api/boards (protected)',
        update: 'PUT /api/boards/:id (protected)',
        delete: 'DELETE /api/boards/:id (protected)'
      },
      lists: {
        getByBoard: 'GET /api/lists/board/:boardId (protected)',
        getById: 'GET /api/lists/:id (protected)',
        create: 'POST /api/lists (protected)',
        update: 'PUT /api/lists/:id (protected)',
        delete: 'DELETE /api/lists/:id (protected)'
      },
      cards: {
        getByList: 'GET /api/cards/list/:listId (protected)',
        getById: 'GET /api/cards/:id (protected)',
        create: 'POST /api/cards (protected)',
        update: 'PUT /api/cards/:id (protected)',
        delete: 'DELETE /api/cards/:id (protected)'
      }
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

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, async () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);

    // Check database connection
    await checkDatabaseConnection();
  });
}

export default app;

