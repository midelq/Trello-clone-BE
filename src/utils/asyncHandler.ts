import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export const asyncHandler = (fn: AsyncHandler) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await fn(req, res, next);
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

            // If headers are already sent, delegate to default error handler
            if (res.headersSent) {
                return next(error);
            }

            res.status(500).json({
                error: 'Internal Server Error',
                message: process.env.NODE_ENV === 'development'
                    ? (error as Error).message
                    : 'Something went wrong'
            });
        }
    };
};
