import { Router } from 'express';
import {
  getListsByBoard,
  getListById,
  createList,
  updateList,
  deleteList
} from '../controllers/list.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All list routes require authentication
router.use(authMiddleware);

// GET /api/lists/board/:boardId - Get all lists for a specific board
router.get('/board/:boardId', getListsByBoard);

// GET /api/lists/:id - Get single list by ID
router.get('/:id', getListById);

// POST /api/lists - Create new list
router.post('/', createList);

// PUT /api/lists/:id - Update list
router.put('/:id', updateList);

// DELETE /api/lists/:id - Delete list
router.delete('/:id', deleteList);

export default router;

