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

/**
 * @swagger
 * tags:
 *   name: Boards
 *   description: Board management endpoints
 */

/**
 * @swagger
 * /api/boards:
 *   get:
 *     summary: Get all boards for the authenticated user
 *     tags: [Boards]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of boards
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', getAllBoards);

/**
 * @swagger
 * /api/boards/{id}:
 *   get:
 *     summary: Get a board by ID
 *     tags: [Boards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Board ID
 *     responses:
 *       200:
 *         description: Board details
 *       403:
 *         description: Forbidden (not owner)
 *       404:
 *         description: Board not found
 *       500:
 *         description: Server error
 */
router.get('/:id', authorizeBoard, getBoardById);

/**
 * @swagger
 * /api/boards/{id}/full:
 *   get:
 *     summary: Get full board details (lists and cards)
 *     tags: [Boards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Board ID
 *     responses:
 *       200:
 *         description: Full board details with nested lists and cards
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Board not found
 *       500:
 *         description: Server error
 */
router.get('/:id/full', authorizeBoard, getBoardFull);

/**
 * @swagger
 * /api/boards:
 *   post:
 *     summary: Create a new board
 *     tags: [Boards]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 example: My New Project
 *     responses:
 *       201:
 *         description: Board created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/', createBoard);

/**
 * @swagger
 * /api/boards/{id}:
 *   put:
 *     summary: Update a board
 *     tags: [Boards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Board ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *     responses:
 *       200:
 *         description: Board updated successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Board not found
 *       500:
 *         description: Server error
 */
router.put('/:id', authorizeBoard, updateBoard);

/**
 * @swagger
 * /api/boards/{id}:
 *   delete:
 *     summary: Delete a board
 *     tags: [Boards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Board ID
 *     responses:
 *       200:
 *         description: Board deleted successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Board not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', authorizeBoard, deleteBoard);

export default router;
