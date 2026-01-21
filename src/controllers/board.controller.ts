import { Request, Response } from 'express';
import { z } from 'zod';
import { boardService } from '../services/board.service';

// Validation schemas
const createBoardSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters')
});

const updateBoardSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters')
});

// Get all boards for authenticated user
export const getAllBoards = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }

    const boards = await boardService.findAllByOwner(req.user.userId);

    if (boards.length === 0) {
      res.status(200).json({
        boards: [],
        count: 0,
        message: 'No boards created yet'
      });
      return;
    }

    res.status(200).json({
      boards,
      count: boards.length
    });
  } catch (error) {
    console.error('Get boards error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get boards'
    });
  }
};

export const getBoardById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }

    const boardId = parseInt(req.params.id);

    if (isNaN(boardId)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid board ID'
      });
      return;
    }

    const board = await boardService.findByIdAndOwner(boardId, req.user.userId);

    if (!board) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Board not found or you do not have access'
      });
      return;
    }

    res.status(200).json({
      board
    });
  } catch (error) {
    console.error('Get board error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get board'
    });
  }
};

// Get full board with lists and cards
export const getBoardFull = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }

    const boardId = parseInt(req.params.id);

    if (isNaN(boardId)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid board ID'
      });
      return;
    }

    const board = await boardService.findFullByIdAndOwner(boardId, req.user.userId);

    if (!board) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Board not found or you do not have access'
      });
      return;
    }

    res.status(200).json({
      board
    });
  } catch (error) {
    console.error('Get full board error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get full board details'
    });
  }
};

// Create new board
export const createBoard = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }

    const validatedData = createBoardSchema.parse(req.body);

    const newBoard = await boardService.create(validatedData.title, req.user.userId);

    res.status(201).json({
      message: 'Board created successfully',
      board: newBoard
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

    console.error('Create board error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create board'
    });
  }
};

// Update board
export const updateBoard = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }

    const boardId = parseInt(req.params.id);

    if (isNaN(boardId)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid board ID'
      });
      return;
    }

    const validatedData = updateBoardSchema.parse(req.body);

    const updatedBoard = await boardService.update(boardId, req.user.userId, validatedData.title);

    if (!updatedBoard) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Board not found or you do not have permission'
      });
      return;
    }

    res.status(200).json({
      message: 'Board updated successfully',
      board: updatedBoard
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

    console.error('Update board error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update board'
    });
  }
};

// Delete board
export const deleteBoard = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }

    const boardId = parseInt(req.params.id);

    if (isNaN(boardId)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid board ID'
      });
      return;
    }

    const isDeleted = await boardService.delete(boardId, req.user.userId);

    if (!isDeleted) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Board not found or you do not have permission'
      });
      return;
    }

    res.status(200).json({
      message: 'Board deleted successfully'
    });
  } catch (error) {
    console.error('Delete board error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete board'
    });
  }
};
