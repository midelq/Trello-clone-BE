import { Router } from 'express';
import {
  getAllBoards,
  getBoardById,
  getBoardFull,
  createBoard,
  updateBoard,
  deleteBoard
} from '../controllers/board.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { authorizeBoard } from '../middleware/authorize.middleware';

const router = Router();

// All board routes require authentication
router.use(authMiddleware);

// GET /api/boards - Get all boards for authenticated user
router.get('/', getAllBoards);

// GET /api/boards/:id - Get single board by ID
router.get('/:id', authorizeBoard, getBoardById);

// GET /api/boards/:id/full - Get full board with lists and cards
router.get('/:id/full', authorizeBoard, getBoardFull);

// POST /api/boards - Create new board
router.post('/', createBoard);

// PUT /api/boards/:id - Update board
router.put('/:id', authorizeBoard, updateBoard);

// DELETE /api/boards/:id - Delete board
router.delete('/:id', authorizeBoard, deleteBoard);

export default router;

