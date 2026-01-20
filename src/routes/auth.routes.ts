import { Router } from 'express';
import { register, login, me, changePassword } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

import { authLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

router.get('/me', authMiddleware, me);
router.post('/change-password', authMiddleware, changePassword);

export default router;


