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
