import { Router } from 'express';
import {
  getAllBoards,
  getBoardById,
  createBoard,
  updateBoard,
  deleteBoard
} from '../controllers/board.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All board routes require authentication
router.use(authMiddleware);

// GET /api/boards - Get all boards for authenticated user
router.get('/', getAllBoards);

// GET /api/boards/:id - Get single board by ID
router.get('/:id', getBoardById);

// POST /api/boards - Create new board
router.post('/', createBoard);

// PUT /api/boards/:id - Update board
router.put('/:id', updateBoard);

// DELETE /api/boards/:id - Delete board
router.delete('/:id', deleteBoard);

export default router;

