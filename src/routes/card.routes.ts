import { Router } from 'express';
import {
  getCardsByList,
  getCardById,
  createCard,
  updateCard,
  deleteCard
} from '../controllers/card.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All card routes require authentication
router.use(authMiddleware);

// GET /api/cards/list/:listId - Get all cards for a specific list
router.get('/list/:listId', getCardsByList);

// GET /api/cards/:id - Get single card by ID
router.get('/:id', getCardById);

// POST /api/cards - Create new card
router.post('/', createCard);

// PUT /api/cards/:id - Update card
router.put('/:id', updateCard);

// DELETE /api/cards/:id - Delete card
router.delete('/:id', deleteCard);

export default router;

