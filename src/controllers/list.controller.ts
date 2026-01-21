import { Request, Response } from 'express';
import { z } from 'zod';
import { listService } from '../services/list.service';

// Validation schemas
const createListSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  boardId: z.number().int().positive('Board ID must be a positive integer'),
  position: z.number().int().min(0).optional()
});

const updateListSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters').optional(),
  position: z.number().int().min(0).optional()
}).refine(data => data.title !== undefined || data.position !== undefined, {
  message: 'At least one field (title or position) must be provided'
});

// Get all lists for a specific board
export const getListsByBoard = async (req: Request, res: Response): Promise<void> => {
  try {
    const boardId = parseInt(req.params.boardId);

    if (isNaN(boardId)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid board ID'
      });
      return;
    }

    // Ownership check is handled by authorizedBoard middleware

    const boardLists = await listService.findByBoardId(boardId);

    res.status(200).json({
      lists: boardLists,
      count: boardLists.length
    });
  } catch (error) {
    console.error('Get lists error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get lists'
    });
  }
};

// Get single list by ID
export const getListById = async (req: Request, res: Response): Promise<void> => {
  try {
    const listId = parseInt(req.params.id);

    if (isNaN(listId)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid list ID'
      });
      return;
    }

    // Access check is handled by authorizeList middleware

    const list = await listService.findById(listId);

    if (!list) {
      res.status(404).json({
        error: 'Not Found',
        message: 'List not found'
      });
      return;
    }

    res.status(200).json({
      list
    });
  } catch (error) {
    console.error('Get list error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get list'
    });
  }
};

// Create new list
export const createList = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = createListSchema.parse(req.body);

    const newList = await listService.create({
      title: validatedData.title,
      boardId: validatedData.boardId,
      position: validatedData.position
    });

    res.status(201).json({
      message: 'List created successfully',
      list: newList
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

    console.error('Create list error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create list'
    });
  }
};

// Update list
export const updateList = async (req: Request, res: Response): Promise<void> => {
  try {
    const listId = parseInt(req.params.id);

    if (isNaN(listId)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid list ID'
      });
      return;
    }

    const validatedData = updateListSchema.parse(req.body);

    const updatedList = await listService.update(listId, validatedData);

    if (!updatedList) {
      res.status(404).json({
        error: 'Not Found',
        message: 'List not found'
      });
      return;
    }

    res.status(200).json({
      message: 'List updated successfully',
      list: updatedList
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

    console.error('Update list error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update list'
    });
  }
};

// Delete list
export const deleteList = async (req: Request, res: Response): Promise<void> => {
  try {
    const listId = parseInt(req.params.id);

    if (isNaN(listId)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid list ID'
      });
      return;
    }

    const isDeleted = await listService.delete(listId);

    if (!isDeleted) {
      res.status(404).json({
        error: 'Not Found',
        message: 'List not found'
      });
      return;
    }

    res.status(200).json({
      message: 'List deleted successfully'
    });
  } catch (error) {
    console.error('Delete list error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete list'
    });
  }
};
