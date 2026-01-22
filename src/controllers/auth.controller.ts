import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { emailService } from '../services/email.service';
import { StatusCodes } from 'http-status-codes';

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
// Validation schemas
import { registerSchema, loginSchema, changePasswordSchema } from '../schemas/auth.schema';


export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = registerSchema.parse(req.body);

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, validatedData.email))
      .limit(1);

    if (existingUser.length > 0) {
      res.status(StatusCodes.CONFLICT).json({
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

    // Send welcome email (awaiting it because Vercel freezes background tasks)
    try {
      await emailService.sendWelcomeEmail(newUser[0].email, newUser[0].fullName);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // We don't throw error here to allow registration to succeed even if email fails
    }

    res.status(StatusCodes.CREATED).json({
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
      res.status(StatusCodes.BAD_REQUEST).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: error.issues
      });
      return;
    }

    console.error('Registration error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
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
      res.status(StatusCodes.UNAUTHORIZED).json({
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
      res.status(StatusCodes.UNAUTHORIZED).json({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
      return;
    }

    // Generate token
    const token = generateToken(user[0].id, user[0].email, user[0].fullName);

    res.status(StatusCodes.OK).json({
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
      res.status(StatusCodes.BAD_REQUEST).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: error.issues
      });
      return;
    }

    console.error('Login error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Internal Server Error',
      message: 'Failed to login'
    });
  }
};

export const me = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(StatusCodes.UNAUTHORIZED).json({
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
      res.status(StatusCodes.NOT_FOUND).json({
        error: 'Not Found',
        message: 'User not found'
      });
      return;
    }

    res.status(StatusCodes.OK).json({
      user: user[0]
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Internal Server Error',
      message: 'Failed to get user info'
    });
  }
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }

    const validatedData = changePasswordSchema.parse(req.body);

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.userId))
      .limit(1);

    if (user.length === 0) {
      res.status(StatusCodes.NOT_FOUND).json({
        error: 'Not Found',
        message: 'User not found'
      });
      return;
    }

    const isPasswordValid = await bcrypt.compare(
      validatedData.currentPassword,
      user[0].password
    );

    if (!isPasswordValid) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        error: 'Unauthorized',
        message: 'Current password is incorrect'
      });
      return;
    }

    const isSamePassword = await bcrypt.compare(
      validatedData.newPassword,
      user[0].password
    );

    if (isSamePassword) {
      res.status(StatusCodes.BAD_REQUEST).json({
        error: 'Validation Error',
        message: 'New password must be different from current password'
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(validatedData.newPassword, 10);

    await db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(users.id, req.user.userId));

    res.status(StatusCodes.OK).json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(StatusCodes.BAD_REQUEST).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: error.issues
      });
      return;
    }

    console.error('Change password error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Internal Server Error',
      message: 'Failed to change password'
    });
  }
};


