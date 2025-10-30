import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

// Validation schemas
const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100)
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
});

const generateToken = (userId: number, email: string, fullName: string): string => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  return jwt.sign(
    { userId, email, fullName },
    jwtSecret,
    { expiresIn: '1d' } 
  );
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = registerSchema.parse(req.body);

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, validatedData.email))
      .limit(1);

    if (existingUser.length > 0) {
      res.status(409).json({
        error: 'Conflict',
        message: 'Email already exists'
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Create user
    const newUser = await db
      .insert(users)
      .values({
        fullName: validatedData.fullName,
        email: validatedData.email,
        password: hashedPassword
      })
      .returning({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        createdAt: users.createdAt
      });

    // Generate token
    const token = generateToken(newUser[0].id, newUser[0].email, newUser[0].fullName);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser[0].id,
        fullName: newUser[0].fullName,
        email: newUser[0].email,
        createdAt: newUser[0].createdAt
      },
      token
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: error.issues
      });
      return;
    }

    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to register user'
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = loginSchema.parse(req.body);

    // Find user
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, validatedData.email))
      .limit(1);

    if (user.length === 0) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
      return;
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(
      validatedData.password,
      user[0].password
    );

    if (!isPasswordValid) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
      return;
    }

    // Generate token
    const token = generateToken(user[0].id, user[0].email, user[0].fullName);

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user[0].id,
        fullName: user[0].fullName,
        email: user[0].email,
        createdAt: user[0].createdAt
      },
      token
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: error.issues
      });
      return;
    }

    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to login'
    });
  }
};

export const me = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }

    const user = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        createdAt: users.createdAt
      })
      .from(users)
      .where(eq(users.id, req.user.userId))
      .limit(1);

    if (user.length === 0) {
      res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
      return;
    }

    res.status(200).json({
      user: user[0]
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get user info'
    });
  }
};

