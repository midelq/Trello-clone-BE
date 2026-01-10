# Code Review: Trello Clone Backend

**Reviewer:** Code Review Assistant  
**Date:** January 2026  
**Project:** Trello Clone Backend API

---

## Overview

This is a comprehensive code review of the Trello Clone Backend project. The codebase demonstrates solid foundational skills in building a REST API with Express.js, TypeScript, and PostgreSQL. This review aims to provide constructive feedback to help improve both the code quality and your development skills.

**Tech Stack:**
- Runtime: Node.js 20+
- Framework: Express.js 4.18
- Language: TypeScript 5.3
- Database: PostgreSQL (Neon)
- ORM: Drizzle ORM
- Authentication: JWT
- Validation: Zod
- Testing: Jest + Supertest

---

## What You Did Well

Before diving into improvements, let's acknowledge the strengths of this project:

### 1. Clean Project Structure
The project follows a logical layered architecture with clear separation:
```
src/
├── controllers/    # Business logic
├── routes/         # HTTP routing
├── middleware/     # Cross-cutting concerns
├── services/       # External integrations
├── db/             # Database schema & connection
└── __tests__/      # Test suite
```

### 2. Strong Type Safety
Excellent use of TypeScript with Drizzle's inferred types:
```typescript
// src/db/schema.ts:114-127
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

### 3. Comprehensive Integration Tests
The test suite covers happy paths and edge cases thoroughly. The test factories pattern (`testFactories.ts`) is a professional approach.

### 4. Proper Input Validation
Using Zod for runtime validation is the right choice:
```typescript
const registerSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100)
});
```

### 5. Smart Database Connection
The lazy initialization with Proxy pattern in `src/db/index.ts` is clever and works well for serverless environments.

### 6. Position Management
The list/card reordering logic correctly handles position shifts. This is often overlooked by junior developers.

### 7. Cascade Deletes
Proper use of `onDelete: 'cascade'` maintains referential integrity automatically.

---

## Critical Issues (Must Fix)

### 1. Missing JWT_SECRET in .env.example

**File:** `.env.example`

**What:** The `JWT_SECRET` environment variable is not documented in the example file.

**Why:** This is a security-critical variable. Without it documented:
- New developers won't know they need to set it
- Deployments may fail or use insecure defaults
- The application throws an error at runtime if missing

**How to fix:**
```env
# .env.example - Add this line:
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
```

Also, consider validating environment variables at startup (see Architecture section).

---

### 2. Exposed Database Credentials in .env.example

**File:** `.env.example:2`

**What:** The example file contains what appears to be real database credentials:
```
DATABASE_URL=postgresql://neondb_owner:npg_TQlhcI1sddddH6zk@ep-small-brook...
```

**Why:** Even if the password is partially masked, this exposes:
- Your database host
- Username format
- Database naming conventions
- A potential attack vector if the password is real

**How to fix:**
```env
# Use clearly fake example values
DATABASE_URL=postgresql://username:password@localhost:5432/trello_clone
```

**Action:** If this was a real credential, rotate it immediately in your Neon dashboard.

---

### 3. Overly Permissive CORS Configuration

**File:** `src/index.ts:17-18`

**What:** CORS is configured to allow any origin:
```typescript
app.use(cors({
  origin: true, // Allows ANY origin
  credentials: true,
  // ...
}));
```

**Why:** This defeats the purpose of CORS protection. Any website can make authenticated requests to your API, enabling:
- CSRF attacks
- Data theft from authenticated users
- Credential harvesting

**How to fix:**
```typescript
// src/index.ts
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

### 4. No Rate Limiting

**What:** Authentication endpoints have no rate limiting.

**Why:** Without rate limiting, attackers can:
- Brute force passwords
- Enumerate valid emails
- Denial of Service (DoS) your API

**How to fix:**
```bash
npm install express-rate-limit
```

```typescript
// src/middleware/rateLimit.middleware.ts
import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too Many Requests',
    message: 'Too many login attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please slow down.'
  }
});
```

```typescript
// src/routes/auth.routes.ts
import { authLimiter } from '../middleware/rateLimit.middleware';

router.post('/login', authLimiter, login);
router.post('/register', authLimiter, register);
```

---

## Architecture Improvements

### 1. Extract Business Logic into Service Layer

**What:** Controllers currently contain validation, authorization, and database queries all mixed together.

**Why:** 
- Controllers become "fat" and hard to test
- Business logic is duplicated (e.g., ownership checks)
- Difficult to reuse logic across different entry points (REST, WebSocket, CLI)

**Current structure:**
```
Routes -> Controllers (validation + auth + business logic + DB) -> Database
```

**Recommended structure:**
```
Routes -> Controllers (HTTP handling) -> Services (business logic) -> Repositories (DB)
```

**How to fix:**

Create a service layer:

```typescript
// src/services/board.service.ts
import { db } from '../db';
import { boards } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export class BoardService {
  async findAllByOwner(ownerId: number) {
    return db
      .select({
        id: boards.id,
        title: boards.title,
        ownerId: boards.ownerId,
        createdAt: boards.createdAt,
        updatedAt: boards.updatedAt
      })
      .from(boards)
      .where(eq(boards.ownerId, ownerId));
  }

  async findByIdAndOwner(boardId: number, ownerId: number) {
    const result = await db
      .select()
      .from(boards)
      .where(and(eq(boards.id, boardId), eq(boards.ownerId, ownerId)))
      .limit(1);
    
    return result[0] || null;
  }

  async create(title: string, ownerId: number) {
    const [board] = await db
      .insert(boards)
      .values({ title, ownerId })
      .returning();
    
    return board;
  }

  async isOwner(boardId: number, userId: number): Promise<boolean> {
    const board = await this.findByIdAndOwner(boardId, userId);
    return board !== null;
  }
}

export const boardService = new BoardService();
```

Then simplify the controller:

```typescript
// src/controllers/board.controller.ts
import { boardService } from '../services/board.service';

export const getAllBoards = async (req: Request, res: Response): Promise<void> => {
  try {
    const boards = await boardService.findAllByOwner(req.user!.userId);
    
    res.status(200).json({
      boards,
      count: boards.length
    });
  } catch (error) {
    console.error('Get boards error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get boards'
    });
  }
};
```

---

### 2. Centralize Authorization Logic

**What:** Authorization checks are duplicated across controllers:
- `checkBoardOwnership` in `list.controller.ts:22-35`
- `checkListOwnership` in `card.controller.ts:25-34`

**Why:**
- Code duplication violates DRY principle
- Easy to introduce inconsistencies
- Harder to audit security

**How to fix:**

Create a dedicated authorization service:

```typescript
// src/services/authorization.service.ts
import { db } from '../db';
import { boards, lists, cards } from '../db/schema';
import { eq } from 'drizzle-orm';

export class AuthorizationService {
  async canAccessBoard(boardId: number, userId: number): Promise<boolean> {
    const [board] = await db
      .select({ ownerId: boards.ownerId })
      .from(boards)
      .where(eq(boards.id, boardId))
      .limit(1);
    
    return board?.ownerId === userId;
  }

  async canAccessList(listId: number, userId: number): Promise<boolean> {
    const [result] = await db
      .select({ ownerId: boards.ownerId })
      .from(lists)
      .innerJoin(boards, eq(lists.boardId, boards.id))
      .where(eq(lists.id, listId))
      .limit(1);
    
    return result?.ownerId === userId;
  }

  async canAccessCard(cardId: number, userId: number): Promise<boolean> {
    const [result] = await db
      .select({ ownerId: boards.ownerId })
      .from(cards)
      .innerJoin(lists, eq(cards.listId, lists.id))
      .innerJoin(boards, eq(lists.boardId, boards.id))
      .where(eq(cards.id, cardId))
      .limit(1);
    
    return result?.ownerId === userId;
  }
}

export const authorizationService = new AuthorizationService();
```

Or create authorization middleware:

```typescript
// src/middleware/authorize.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { authorizationService } from '../services/authorization.service';

export const authorizeBoard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const boardId = parseInt(req.params.id || req.params.boardId || req.body.boardId);
  
  if (isNaN(boardId)) {
    res.status(400).json({ error: 'Bad Request', message: 'Invalid board ID' });
    return;
  }

  const hasAccess = await authorizationService.canAccessBoard(boardId, req.user!.userId);
  
  if (!hasAccess) {
    res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
    return;
  }

  next();
};
```

---

### 3. Validate Environment Variables at Startup

**What:** Environment variables are checked at runtime when first used.

**Why:**
- Application may start but fail on first request
- Error messages are scattered across the codebase
- No single source of truth for required configuration

**How to fix:**

```typescript
// src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  ALLOWED_ORIGINS: z.string().optional(),
  EMAIL_USER: z.string().email().optional(),
  EMAIL_PASSWORD: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
```

Then use throughout the application:

```typescript
// src/index.ts
import { env } from './config/env';

const PORT = env.PORT;

// src/middleware/auth.middleware.ts
import { env } from '../config/env';

const decoded = jwt.verify(token, env.JWT_SECRET);
```

---

### 4. Use Database Transactions for Multi-Step Operations

**What:** Position reordering operations are not atomic.

**Why:** If the server crashes between operations, data becomes inconsistent:
```typescript
// src/controllers/list.controller.ts:421-436
await db.delete(lists).where(eq(lists.id, listId));  // Step 1

// If server crashes here, positions are corrupted

await db.update(lists).set({...}).where(...);  // Step 2
```

**How to fix:**

```typescript
// Use Drizzle transactions
import { db } from '../db';

await db.transaction(async (tx) => {
  // Delete the list
  await tx.delete(lists).where(eq(lists.id, listId));
  
  // Shift remaining positions
  await tx
    .update(lists)
    .set({ 
      position: sql`${lists.position} - 1`,
      updatedAt: new Date()
    })
    .where(
      and(
        eq(lists.boardId, boardId),
        gte(lists.position, deletedPosition + 1)
      )
    );
});
```

---

## Code Quality Improvements

### 1. Consistent Language in User-Facing Messages

**File:** `src/controllers/board.controller.ts:42-43`

**What:** There's a Ukrainian message mixed with English:
```typescript
message: 'Ще не створено жодної дошки'
```

**Why:** 
- Inconsistent user experience
- Makes internationalization (i18n) harder later
- Confusing for non-Ukrainian speakers

**How to fix:**
```typescript
message: 'No boards created yet'
```

If you need multilingual support, consider a proper i18n library like `i18next`.

---

### 2. Move Email Templates to Separate Files

**File:** `src/services/email.service.ts:79-204`

**What:** 125+ lines of HTML embedded in TypeScript code.

**Why:**
- Hard to maintain and modify
- Difficult to preview changes
- Can't be edited by non-developers (designers, content writers)
- Syntax highlighting doesn't work for HTML in template strings

**How to fix:**

Create a templates directory:

```
src/
├── templates/
│   └── emails/
│       └── welcome.html
```

```html
<!-- src/templates/emails/welcome.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Welcome to Trello Clone!</title>
  <style>
    /* Your styles */
  </style>
</head>
<body>
  <div class="container">
    <h1>Welcome, {{userName}}!</h1>
    <p><strong>Email:</strong> {{userEmail}}</p>
  </div>
</body>
</html>
```

```typescript
// src/services/email.service.ts
import { readFileSync } from 'fs';
import { join } from 'path';

private loadTemplate(name: string, variables: Record<string, string>): string {
  const templatePath = join(__dirname, '../templates/emails', `${name}.html`);
  let html = readFileSync(templatePath, 'utf-8');
  
  for (const [key, value] of Object.entries(variables)) {
    html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  
  return html;
}

async sendWelcomeEmail(userEmail: string, userName: string): Promise<boolean> {
  const html = this.loadTemplate('welcome', { userName, userEmail });
  
  return this.sendEmail({
    to: userEmail,
    subject: 'Welcome to Trello Clone!',
    html
  });
}
```

---

### 3. Extract Validation Schemas to Separate Files

**What:** Zod schemas are defined at the top of each controller file.

**Why:**
- Harder to reuse schemas across controllers
- Controller files are longer than necessary
- Can't share schemas with frontend

**How to fix:**

```typescript
// src/schemas/auth.schema.ts
import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100)
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters').max(100)
});

// Type inference for use elsewhere
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
```

---

### 4. Add Request Logging

**What:** No request logging middleware.

**Why:**
- Hard to debug production issues
- No visibility into API usage patterns
- Can't track slow requests

**How to fix:**

```bash
npm install morgan
npm install -D @types/morgan
```

```typescript
// src/index.ts
import morgan from 'morgan';

// Development: detailed logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Production: structured JSON logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
}
```

For more advanced logging, consider `pino` or `winston`.

---

### 5. Use the Activities Table You Created

**File:** `src/db/schema.ts:47-62`

**What:** The `activities` table exists but is never used.

**Why:**
- Dead code adds confusion
- You're missing valuable audit trail functionality
- Great feature for users to see history

**How to fix:**

Either remove the table or implement activity logging:

```typescript
// src/services/activity.service.ts
import { db } from '../db';
import { activities } from '../db/schema';

type ActivityType = 
  | 'board_created' 
  | 'list_created' 
  | 'card_created' 
  | 'card_moved'
  | 'card_updated';

export async function logActivity(params: {
  type: ActivityType;
  description: string;
  userId: number;
  boardId: number;
  listId?: number;
  cardId?: number;
}) {
  await db.insert(activities).values(params);
}
```

```typescript
// Usage in card.controller.ts
await logActivity({
  type: 'card_created',
  description: `Created card "${newCard.title}"`,
  userId: req.user.userId,
  boardId: board.id,
  listId: validatedData.listId,
  cardId: newCard.id
});
```

---

### 6. Reduce Code Duplication in Error Handling

**What:** The same error handling pattern is repeated in every controller method.

**How to fix:**

Create a wrapper function:

```typescript
// src/utils/asyncHandler.ts
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

type AsyncHandler = (req: Request, res: Response) => Promise<void>;

export const asyncHandler = (fn: AsyncHandler) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid input data',
          details: error.issues
        });
        return;
      }

      console.error('Unhandled error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' 
          ? (error as Error).message 
          : 'Something went wrong'
      });
    }
  };
};
```

```typescript
// src/controllers/board.controller.ts
import { asyncHandler } from '../utils/asyncHandler';

export const createBoard = asyncHandler(async (req, res) => {
  const validatedData = createBoardSchema.parse(req.body);
  
  const [newBoard] = await db
    .insert(boards)
    .values({
      title: validatedData.title,
      ownerId: req.user!.userId
    })
    .returning();

  res.status(201).json({
    message: 'Board created successfully',
    board: newBoard
  });
});
```

---

## Minor Improvements

### 1. Use HTTP Status Constants

**What:** Magic numbers for HTTP status codes.

**How to fix:**
```typescript
// Option 1: Use http-status-codes package
npm install http-status-codes

import { StatusCodes } from 'http-status-codes';
res.status(StatusCodes.CREATED).json({...});

// Option 2: Define your own constants
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500
} as const;
```

---

### 2. Add API Documentation

**What:** No OpenAPI/Swagger documentation.

**Why:**
- Frontend developers need to guess API structure
- Manual testing is tedious
- Can't auto-generate client SDKs

**How to fix:**

```bash
npm install swagger-ui-express swagger-jsdoc
npm install -D @types/swagger-ui-express @types/swagger-jsdoc
```

```typescript
// src/docs/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Trello Clone API',
      version: '1.0.0',
      description: 'API for Trello Clone application'
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Development' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./src/routes/*.ts']
};

export const swaggerSpec = swaggerJsdoc(options);
```

---

### 3. Add Unit Tests Alongside Integration Tests

**What:** Only integration tests exist.

**Why:**
- Integration tests are slow
- Hard to test edge cases
- Can't test business logic in isolation

**How to fix:**

Add unit tests for services:

```typescript
// src/services/__tests__/board.service.test.ts
import { BoardService } from '../board.service';

// Mock the database
jest.mock('../../db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    // ...
  }
}));

describe('BoardService', () => {
  const service = new BoardService();

  describe('isOwner', () => {
    it('should return true when user owns the board', async () => {
      // ... test implementation
    });

    it('should return false when user does not own the board', async () => {
      // ... test implementation
    });
  });
});
```

---

### 4. Consider Using UUIDs Instead of Sequential IDs

**What:** All entities use auto-incrementing integer IDs.

**Why:**
- Sequential IDs expose entity counts
- Easier to enumerate resources
- Can cause conflicts in distributed systems

**How to fix (for future projects):**
```typescript
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const boards = pgTable('boards', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  // ...
});
```

---

## Summary

### Priority Matrix

| Priority | Issue | Effort |
|----------|-------|--------|
| **Critical** | Fix exposed credentials in .env.example | 5 min |
| **Critical** | Add JWT_SECRET to .env.example | 5 min |
| **Critical** | Fix CORS configuration | 15 min |
| **High** | Add rate limiting | 30 min |
| **High** | Validate env vars at startup | 30 min |
| **Medium** | Extract service layer | 2-3 hours |
| **Medium** | Add database transactions | 1 hour |
| **Medium** | Centralize authorization | 1 hour |
| **Low** | Move email templates | 30 min |
| **Low** | Extract validation schemas | 30 min |
| **Low** | Add request logging | 15 min |

### Final Thoughts

This is a solid project that demonstrates good understanding of backend development fundamentals. The code is readable, the testing approach is professional, and the feature set is complete.

**Key strengths to build on:**
- Your TypeScript usage is excellent
- Testing approach is mature
- Database schema design is clean

**Focus areas for growth:**
- Security best practices (rate limiting, CORS, secrets management)
- Architectural patterns (service layer, dependency injection)
- Operational concerns (logging, monitoring, error tracking)

Keep learning and building! Every senior developer started exactly where you are now.

---

*This review was created to help you grow as a developer. Feel free to ask questions about any of the recommendations.*
