import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { boards } from '../db/schema';
import { eq, and } from 'drizzle-orm';

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

    const userBoards = await db
      .select({
        id: boards.id,
        title: boards.title,
        ownerId: boards.ownerId,
        createdAt: boards.createdAt,
        updatedAt: boards.updatedAt
      })
      .from(boards)
      .where(eq(boards.ownerId, req.user.userId));

    if (userBoards.length === 0) {
      res.status(200).json({
        boards: [],
        count: 0,
        message: 'Ще не створено жодної дошки'
      });
      return;
    }

    res.status(200).json({
      boards: userBoards,
      count: userBoards.length
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

    const board = await db
      .select({
        id: boards.id,
        title: boards.title,
        ownerId: boards.ownerId,
        createdAt: boards.createdAt,
        updatedAt: boards.updatedAt
      })
      .from(boards)
      .where(
        and(
          eq(boards.id, boardId),
          eq(boards.ownerId, req.user.userId)
        )
      )
      .limit(1);

    if (board.length === 0) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Board not found or you do not have access'
      });
      return;
    }

    res.status(200).json({
      board: board[0]
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

    const board = await db.query.boards.findFirst({
      where: and(
        eq(boards.id, boardId),
        eq(boards.ownerId, req.user.userId)
      ),
      with: {
        lists: {
          orderBy: (lists, { asc }) => [asc(lists.position)],
          with: {
            cards: {
              orderBy: (cards, { asc }) => [asc(cards.position)]
            }
          }
        }
      }
    });

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

    const newBoard = await db
      .insert(boards)
      .values({
        title: validatedData.title,
        ownerId: req.user.userId
      })
      .returning({
        id: boards.id,
        title: boards.title,
        ownerId: boards.ownerId,
        createdAt: boards.createdAt,
        updatedAt: boards.updatedAt
      });

    res.status(201).json({
      message: 'Board created successfully',
      board: newBoard[0]
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

    // Check if board exists and user is owner
    const existingBoard = await db
      .select()
      .from(boards)
      .where(
        and(
          eq(boards.id, boardId),
          eq(boards.ownerId, req.user.userId)
        )
      )
      .limit(1);

    if (existingBoard.length === 0) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Board not found or you do not have permission'
      });
      return;
    }

    const updatedBoard = await db
      .update(boards)
      .set({
        title: validatedData.title,
        updatedAt: new Date()
      })
      .where(eq(boards.id, boardId))
      .returning({
        id: boards.id,
        title: boards.title,
        ownerId: boards.ownerId,
        createdAt: boards.createdAt,
        updatedAt: boards.updatedAt
      });

    res.status(200).json({
      message: 'Board updated successfully',
      board: updatedBoard[0]
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

    // Check if board exists and user is owner
    const existingBoard = await db
      .select()
      .from(boards)
      .where(
        and(
          eq(boards.id, boardId),
          eq(boards.ownerId, req.user.userId)
        )
      )
      .limit(1);

    if (existingBoard.length === 0) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Board not found or you do not have permission'
      });
      return;
    }

    await db
      .delete(boards)
      .where(eq(boards.id, boardId));

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

