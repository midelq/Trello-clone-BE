import { Request, Response } from 'express';
import { z } from 'zod';
import { cardService } from '../services/card.service';

// Validation schemas
const createCardSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  listId: z.number().int().positive('List ID must be a positive integer'),
  position: z.number().int().min(0).optional()
});

const updateCardSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters').optional(),
  description: z.string().max(2000, 'Description must be less than 2000 characters').nullable().optional(),
  position: z.number().int().min(0).optional(),
  listId: z.number().int().positive('List ID must be a positive integer').optional()
}).refine(data => data.title !== undefined || data.description !== undefined || data.position !== undefined || data.listId !== undefined, {
  message: 'At least one field (title, description, position, or listId) must be provided'
});

// Get all cards for a specific list
export const getCardsByList = async (req: Request, res: Response): Promise<void> => {
  try {
    const listId = parseInt(req.params.listId);

    if (isNaN(listId)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid list ID'
      });
      return;
    }

    const cards = await cardService.findByListId(listId);

    res.status(200).json({
      cards,
      count: cards.length
    });
  } catch (error) {
    console.error('Get cards error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get cards'
    });
  }
};

// Get single card by ID
export const getCardById = async (req: Request, res: Response): Promise<void> => {
  try {
    const cardId = parseInt(req.params.id);

    if (isNaN(cardId)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid card ID'
      });
      return;
    }

    const card = await cardService.findById(cardId);

    if (!card) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Card not found'
      });
      return;
    }

    res.status(200).json({
      card
    });
  } catch (error) {
    console.error('Get card error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get card'
    });
  }
};

// Create new card
export const createCard = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = createCardSchema.parse(req.body);

    const newCard = await cardService.create({
      title: validatedData.title,
      description: validatedData.description,
      listId: validatedData.listId,
      position: validatedData.position
    });

    res.status(201).json({
      message: 'Card created successfully',
      card: newCard
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: error.issues
      });
      return;
    }

    console.error('Create card error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create card'
    });
  }
};

// Update card
export const updateCard = async (req: Request, res: Response): Promise<void> => {
  try {
    const cardId = parseInt(req.params.id);

    if (isNaN(cardId)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid card ID'
      });
      return;
    }

    const validatedData = updateCardSchema.parse(req.body);

    const updatedCard = await cardService.update(cardId, {
      title: validatedData.title,
      description: validatedData.description,
      listId: validatedData.listId,
      position: validatedData.position
    });

    if (!updatedCard) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Card not found'
      });
      return;
    }

    res.status(200).json({
      message: 'Card updated successfully',
      card: updatedCard
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: error.issues
      });
      return;
    }

    console.error('Update card error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update card'
    });
  }
};

// Delete card
export const deleteCard = async (req: Request, res: Response): Promise<void> => {
  try {
    const cardId = parseInt(req.params.id);

    if (isNaN(cardId)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid card ID'
      });
      return;
    }

    const isDeleted = await cardService.delete(cardId);

    if (!isDeleted) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Card not found'
      });
      return;
    }

    res.status(200).json({
      message: 'Card deleted successfully'
    });
  } catch (error) {
    console.error('Delete card error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete card'
    });
  }
};
