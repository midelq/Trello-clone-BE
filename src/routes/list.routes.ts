import { Router } from 'express';
import {
  getListsByBoard,
  getListById,
  createList,
  updateList,
  deleteList
} from '../controllers/list.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { authorizeBoard, authorizeList } from '../middleware/authorize.middleware';

const router = Router();

// All list routes require authentication
router.use(authMiddleware);

// GET /api/lists/board/:boardId - Get all lists for a specific board
// We check board access because lists belong to a board
router.get('/board/:boardId', authorizeBoard, getListsByBoard);

// GET /api/lists/:id - Get single list by ID
router.get('/:id', authorizeList, getListById);

// POST /api/lists - Create new list
// Creating a list requires a boardId, so we check if user has access to that board
router.post('/', authorizeBoard, createList);

// PUT /api/lists/:id - Update list
router.put('/:id', authorizeList, updateList);

// DELETE /api/lists/:id - Delete list
router.delete('/:id', authorizeList, deleteList);

export default router;

