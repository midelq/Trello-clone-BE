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

/**
 * @swagger
 * tags:
 *   name: Lists
 *   description: List management endpoints
 */

/**
 * @swagger
 * /api/lists/board/{boardId}:
 *   get:
 *     summary: Get all lists for a specific board
 *     tags: [Lists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Board ID
 *     responses:
 *       200:
 *         description: List of lists
 *       403:
 *         description: Forbidden (no access to board)
 *       404:
 *         description: Board not found
 *       500:
 *         description: Server error
 */
router.get('/board/:boardId', authorizeBoard, getListsByBoard);

/**
 * @swagger
 * /api/lists/{id}:
 *   get:
 *     summary: Get a list by ID
 *     tags: [Lists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: List ID
 *     responses:
 *       200:
 *         description: List details
 *       403:
 *         description: Forbidden
 *       404:
 *         description: List not found
 *       500:
 *         description: Server error
 */
router.get('/:id', authorizeList, getListById);

/**
 * @swagger
 * /api/lists:
 *   post:
 *     summary: Create a new list
 *     tags: [Lists]
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
 *               - boardId
 *             properties:
 *               title:
 *                 type: string
 *               boardId:
 *                 type: integer
 *               position:
 *                 type: integer
 *     responses:
 *       201:
 *         description: List created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden (no access to board)
 *       500:
 *         description: Server error
 */
router.post('/', authorizeBoard, createList);

/**
 * @swagger
 * /api/lists/{id}:
 *   put:
 *     summary: Update a list
 *     tags: [Lists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: List ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               position:
 *                 type: integer
 *     responses:
 *       200:
 *         description: List updated successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: List not found
 *       500:
 *         description: Server error
 */
router.put('/:id', authorizeList, updateList);

/**
 * @swagger
 * /api/lists/{id}:
 *   delete:
 *     summary: Delete a list
 *     tags: [Lists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: List ID
 *     responses:
 *       200:
 *         description: List deleted successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: List not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', authorizeList, deleteList);

export default router;
