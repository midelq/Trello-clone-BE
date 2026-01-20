import { Router } from 'express';
import {
  getCardsByList,
  getCardById,
  createCard,
  updateCard,
  deleteCard
} from '../controllers/card.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { authorizeList, authorizeCard } from '../middleware/authorize.middleware';

const router = Router();

// All card routes require authentication
router.use(authMiddleware);

// GET /api/cards/list/:listId - Get all cards for a specific list
// We check list access
router.get('/list/:listId', authorizeList, getCardsByList);

// GET /api/cards/:id - Get single card by ID
router.get('/:id', authorizeCard, getCardById);

// POST /api/cards - Create new card
// Creating a card requires a listId, so we check if user has access to that list
router.post('/', authorizeList, createCard);

// PUT /api/cards/:id - Update card
router.put('/:id', authorizeCard, updateCard);

// DELETE /api/cards/:id - Delete card
router.delete('/:id', authorizeCard, deleteCard);

export default router;

