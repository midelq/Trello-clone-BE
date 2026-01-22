import { Request, Response } from 'express';
import { z } from 'zod';
import { boardService } from '../services/board.service';
import { asyncHandler } from '../utils/asyncHandler';
import { StatusCodes } from 'http-status-codes';

// Validation schemas (could be moved to schemas/board.schema.ts)
const createBoardSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters')
});

const updateBoardSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters')
});

// Get all boards for authenticated user
export const getAllBoards = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({
      error: 'Unauthorized',
      message: 'User not authenticated'
    });
    return;
  }

  const boards = await boardService.findAllByOwner(req.user.userId);

  if (boards.length === 0) {
    res.status(StatusCodes.OK).json({
      boards: [],
      count: 0,
      message: 'No boards created yet'
    });
    return;
  }

  res.status(StatusCodes.OK).json({
    boards,
    count: boards.length
  });
});

export const getBoardById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({
      error: 'Unauthorized',
      message: 'User not authenticated'
    });
    return;
  }

  const boardId = parseInt(req.params.id);

  if (isNaN(boardId)) {
    res.status(StatusCodes.BAD_REQUEST).json({
      error: 'Bad Request',
      message: 'Invalid board ID'
    });
    return;
  }

  const board = await boardService.findByIdAndOwner(boardId, req.user.userId);

  if (!board) {
    res.status(StatusCodes.NOT_FOUND).json({
      error: 'Not Found',
      message: 'Board not found or you do not have access'
    });
    return;
  }

  res.status(StatusCodes.OK).json({
    board
  });
});

// Get full board with lists and cards
export const getBoardFull = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({
      error: 'Unauthorized',
      message: 'User not authenticated'
    });
    return;
  }

  const boardId = parseInt(req.params.id);

  if (isNaN(boardId)) {
    res.status(StatusCodes.BAD_REQUEST).json({
      error: 'Bad Request',
      message: 'Invalid board ID'
    });
    return;
  }

  const board = await boardService.findFullByIdAndOwner(boardId, req.user.userId);

  if (!board) {
    res.status(StatusCodes.NOT_FOUND).json({
      error: 'Not Found',
      message: 'Board not found or you do not have access'
    });
    return;
  }

  res.status(StatusCodes.OK).json({
    board
  });
});

// Create new board
export const createBoard = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({
      error: 'Unauthorized',
      message: 'User not authenticated'
    });
    return;
  }

  const validatedData = createBoardSchema.parse(req.body);

  const newBoard = await boardService.create(validatedData.title, req.user.userId);

  res.status(StatusCodes.CREATED).json({
    message: 'Board created successfully',
    board: newBoard
  });
});

// Update board
export const updateBoard = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({
      error: 'Unauthorized',
      message: 'User not authenticated'
    });
    return;
  }

  const boardId = parseInt(req.params.id);

  if (isNaN(boardId)) {
    res.status(StatusCodes.BAD_REQUEST).json({
      error: 'Bad Request',
      message: 'Invalid board ID'
    });
    return;
  }

  const validatedData = updateBoardSchema.parse(req.body);

  const updatedBoard = await boardService.update(boardId, req.user.userId, validatedData.title);

  if (!updatedBoard) {
    res.status(StatusCodes.NOT_FOUND).json({
      error: 'Not Found',
      message: 'Board not found or you do not have permission'
    });
    return;
  }

  res.status(StatusCodes.OK).json({
    message: 'Board updated successfully',
    board: updatedBoard
  });
});

// Delete board
export const deleteBoard = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({
      error: 'Unauthorized',
      message: 'User not authenticated'
    });
    return;
  }

  const boardId = parseInt(req.params.id);

  if (isNaN(boardId)) {
    res.status(StatusCodes.BAD_REQUEST).json({
      error: 'Bad Request',
      message: 'Invalid board ID'
    });
    return;
  }

  const isDeleted = await boardService.delete(boardId, req.user.userId);

  if (!isDeleted) {
    res.status(StatusCodes.NOT_FOUND).json({
      error: 'Not Found',
      message: 'Board not found or you do not have permission'
    });
    return;
  }

  res.status(StatusCodes.OK).json({
    message: 'Board deleted successfully'
  });
});
