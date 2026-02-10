import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '../db';
import { users, refreshTokens } from '../db/schema';
import { eq, lt } from 'drizzle-orm';
import { emailService } from '../services/email.service';
import { StatusCodes } from 'http-status-codes';

// Configuration
const ACCESS_TOKEN_EXPIRY = '15m'; // Short-lived access token
const REFRESH_TOKEN_EXPIRY_DAYS = 7; // Refresh token valid for 7 days

const generateAccessToken = (userId: number, email: string, fullName: string): string => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  return jwt.sign(
    { userId, email, fullName },
    jwtSecret,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

const generateRefreshToken = (): string => {
  return crypto.randomBytes(64).toString('hex');
};

const getRefreshTokenExpiryDate = (): Date => {
  const date = new Date();
  date.setDate(date.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
  return date;
};

// Cookie options for refresh token
const getRefreshTokenCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' as const : 'lax' as const,
  maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  path: '/'
});

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

    // Generate tokens
    const accessToken = generateAccessToken(newUser[0].id, newUser[0].email, newUser[0].fullName);
    const refreshToken = generateRefreshToken();

    // Store refresh token in database
    await db.insert(refreshTokens).values({
      token: refreshToken,
      userId: newUser[0].id,
      expiresAt: getRefreshTokenExpiryDate()
    });

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());

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
      accessToken // Only send access token in response body
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

    // Generate tokens
    const accessToken = generateAccessToken(user[0].id, user[0].email, user[0].fullName);
    const refreshToken = generateRefreshToken();

    // Clean up old refresh tokens for this user (optional, for security)
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, user[0].id));

    // Store new refresh token in database
    await db.insert(refreshTokens).values({
      token: refreshToken,
      userId: user[0].id,
      expiresAt: getRefreshTokenExpiryDate()
    });

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());

    res.status(StatusCodes.OK).json({
      message: 'Login successful',
      user: {
        id: user[0].id,
        fullName: user[0].fullName,
        email: user[0].email,
        createdAt: user[0].createdAt
      },
      accessToken // Only send access token in response body
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

// New endpoint: Refresh access token
export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        error: 'Unauthorized',
        message: 'No refresh token provided'
      });
      return;
    }

    // Find the refresh token in database
    const storedToken = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, refreshToken))
      .limit(1);

    if (storedToken.length === 0) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        error: 'Unauthorized',
        message: 'Invalid refresh token'
      });
      return;
    }

    // Check if token is expired
    if (new Date() > storedToken[0].expiresAt) {
      // Delete expired token
      await db.delete(refreshTokens).where(eq(refreshTokens.id, storedToken[0].id));
      res.clearCookie('refreshToken');

      res.status(StatusCodes.UNAUTHORIZED).json({
        error: 'Unauthorized',
        message: 'Refresh token expired'
      });
      return;
    }

    // Get user data
    const user = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        createdAt: users.createdAt
      })
      .from(users)
      .where(eq(users.id, storedToken[0].userId))
      .limit(1);

    if (user.length === 0) {
      await db.delete(refreshTokens).where(eq(refreshTokens.id, storedToken[0].id));
      res.clearCookie('refreshToken');

      res.status(StatusCodes.UNAUTHORIZED).json({
        error: 'Unauthorized',
        message: 'User not found'
      });
      return;
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user[0].id, user[0].email, user[0].fullName);

    // Token Rotation: Generate new refresh token and invalidate old one
    const newRefreshToken = generateRefreshToken();

    // Delete old refresh token
    await db.delete(refreshTokens).where(eq(refreshTokens.id, storedToken[0].id));

    // Store new refresh token
    await db.insert(refreshTokens).values({
      token: newRefreshToken,
      userId: user[0].id,
      expiresAt: getRefreshTokenExpiryDate()
    });

    // Set new refresh token cookie
    res.cookie('refreshToken', newRefreshToken, getRefreshTokenCookieOptions());

    res.status(StatusCodes.OK).json({
      user: user[0],
      accessToken: newAccessToken
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Internal Server Error',
      message: 'Failed to refresh token'
    });
  }
};

// New endpoint: Logout (invalidate refresh token)
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      // Delete refresh token from database
      await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken));
    }

    // Clear the cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' as const : 'lax' as const,
      path: '/'
    });

    res.status(StatusCodes.OK).json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Internal Server Error',
      message: 'Failed to logout'
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

    // Invalidate all refresh tokens for this user (force re-login on all devices)
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, req.user.userId));

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

// Cleanup expired tokens (can be called periodically)
export const cleanupExpiredTokens = async (): Promise<void> => {
  try {
    await db.delete(refreshTokens).where(lt(refreshTokens.expiresAt, new Date()));
    console.log('Expired refresh tokens cleaned up');
  } catch (error) {
    console.error('Failed to cleanup expired tokens:', error);
  }
};
