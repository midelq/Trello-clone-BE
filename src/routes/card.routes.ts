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

/**
 * @swagger
 * tags:
 *   name: Cards
 *   description: Card management endpoints
 */

/**
 * @swagger
 * /api/cards/list/{listId}:
 *   get:
 *     summary: Get all cards for a specific list
 *     tags: [Cards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: listId
 *         required: true
 *         schema:
 *           type: integer
 *         description: List ID
 *     responses:
 *       200:
 *         description: List of cards
 *       403:
 *         description: Forbidden (no access to list)
 *       404:
 *         description: List not found
 *       500:
 *         description: Server error
 */
router.get('/list/:listId', authorizeList, getCardsByList);

/**
 * @swagger
 * /api/cards/{id}:
 *   get:
 *     summary: Get a card by ID
 *     tags: [Cards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Card ID
 *     responses:
 *       200:
 *         description: Card details
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Card not found
 *       500:
 *         description: Server error
 */
router.get('/:id', authorizeCard, getCardById);

/**
 * @swagger
 * /api/cards:
 *   post:
 *     summary: Create a new card
 *     tags: [Cards]
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
 *               - listId
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               listId:
 *                 type: integer
 *               position:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Card created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden (no access to list)
 *       500:
 *         description: Server error
 */
router.post('/', authorizeList, createCard);

/**
 * @swagger
 * /api/cards/{id}:
 *   put:
 *     summary: Update a card
 *     tags: [Cards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Card ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               position:
 *                 type: integer
 *               listId:
 *                 type: integer
 *                 description: Move card to another list
 *     responses:
 *       200:
 *         description: Card updated successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Card not found
 *       500:
 *         description: Server error
 */
router.put('/:id', authorizeCard, updateCard);

/**
 * @swagger
 * /api/cards/{id}:
 *   delete:
 *     summary: Delete a card
 *     tags: [Cards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Card ID
 *     responses:
 *       200:
 *         description: Card deleted successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Card not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', authorizeCard, deleteCard);

export default router;
