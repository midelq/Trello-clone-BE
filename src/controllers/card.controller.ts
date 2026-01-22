import { Request, Response } from 'express';
import { z } from 'zod';
import { cardService } from '../services/card.service';
import { StatusCodes } from 'http-status-codes';

import { activityService } from '../services/activity.service';
import { listService } from '../services/list.service';
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
      res.status(StatusCodes.BAD_REQUEST).json({
        error: 'Bad Request',
        message: 'Invalid list ID'
      });
      return;
    }

    const cards = await cardService.findByListId(listId);

    res.status(StatusCodes.OK).json({
      cards,
      count: cards.length
    });
  } catch (error) {
    console.error('Get cards error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
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
      res.status(StatusCodes.BAD_REQUEST).json({
        error: 'Bad Request',
        message: 'Invalid card ID'
      });
      return;
    }

    const card = await cardService.findById(cardId);

    if (!card) {
      res.status(StatusCodes.NOT_FOUND).json({
        error: 'Not Found',
        message: 'Card not found'
      });
      return;
    }

    res.status(StatusCodes.OK).json({
      card
    });
  } catch (error) {
    console.error('Get card error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
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

    if (req.user) {
      const list = await listService.findById(validatedData.listId);
      if (list) {
        await activityService.logActivity({
          type: 'card_created',
          description: `Created card "${newCard.title}"`,
          userId: req.user.userId,
          boardId: list.boardId,
          listId: list.id,
          cardId: newCard.id
        });
      }
    }

    res.status(StatusCodes.CREATED).json({
      message: 'Card created successfully',
      card: newCard
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(StatusCodes.BAD_REQUEST).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: error.issues
      });
      return;
    }

    console.error('Create card error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
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
      res.status(StatusCodes.BAD_REQUEST).json({
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
      res.status(StatusCodes.NOT_FOUND).json({
        error: 'Not Found',
        message: 'Card not found'
      });
      return;
    }

    if (req.user) {
      const list = await listService.findById(updatedCard.listId);
      if (list) {
        let type: any = 'card_updated';
        let description = `Updated card "${updatedCard.title}"`;

        if (validatedData.listId) {
          type = 'card_moved';
          description = `Moved card "${updatedCard.title}" to list "${list.title}"`;
        }

        await activityService.logActivity({
          type,
          description,
          userId: req.user.userId,
          boardId: list.boardId,
          listId: list.id,
          cardId: updatedCard.id
        });
      }
    }

    res.status(StatusCodes.OK).json({
      message: 'Card updated successfully',
      card: updatedCard
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(StatusCodes.BAD_REQUEST).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: error.issues
      });
      return;
    }

    console.error('Update card error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
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
      res.status(StatusCodes.BAD_REQUEST).json({
        error: 'Bad Request',
        message: 'Invalid card ID'
      });
      return;
    }

    // Get card before delete to log activity
    const card = await cardService.findById(cardId);

    const isDeleted = await cardService.delete(cardId);

    if (!isDeleted || !card) {
      res.status(StatusCodes.NOT_FOUND).json({
        error: 'Not Found',
        message: 'Card not found'
      });
      return;
    }

    if (req.user) {
      const list = await listService.findById(card.listId);
      if (list) {
        await activityService.logActivity({
          type: 'card_deleted',
          description: `Deleted card "${card.title}"`,
          userId: req.user.userId,
          boardId: list.boardId,
          listId: list.id,
          cardId: card.id
        });
      }
    }

    res.status(StatusCodes.OK).json({
      message: 'Card deleted successfully'
    });
  } catch (error) {
    console.error('Delete card error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Internal Server Error',
      message: 'Failed to delete card'
    });
  }
};
