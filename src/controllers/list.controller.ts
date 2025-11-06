import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { lists, boards } from '../db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

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

// Helper function to check if user owns the board
const checkBoardOwnership = async (boardId: number, userId: number): Promise<boolean> => {
  const board = await db
    .select()
    .from(boards)
    .where(
      and(
        eq(boards.id, boardId),
        eq(boards.ownerId, userId)
      )
    )
    .limit(1);
  
  return board.length > 0;
};

// Get all lists for a specific board
export const getListsByBoard = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }

    const boardId = parseInt(req.params.boardId);

    if (isNaN(boardId)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid board ID'
      });
      return;
    }

    // Check if user owns the board
    const ownsBoard = await checkBoardOwnership(boardId, req.user.userId);
    if (!ownsBoard) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this board'
      });
      return;
    }

    const boardLists = await db
      .select({
        id: lists.id,
        title: lists.title,
        position: lists.position,
        boardId: lists.boardId,
        createdAt: lists.createdAt,
        updatedAt: lists.updatedAt
      })
      .from(lists)
      .where(eq(lists.boardId, boardId))
      .orderBy(lists.position);

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
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }

    const listId = parseInt(req.params.id);

    if (isNaN(listId)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid list ID'
      });
      return;
    }

    const list = await db
      .select({
        id: lists.id,
        title: lists.title,
        position: lists.position,
        boardId: lists.boardId,
        createdAt: lists.createdAt,
        updatedAt: lists.updatedAt
      })
      .from(lists)
      .where(eq(lists.id, listId))
      .limit(1);

    if (list.length === 0) {
      res.status(404).json({
        error: 'Not Found',
        message: 'List not found'
      });
      return;
    }

    // Check if user owns the board that contains this list
    const ownsBoard = await checkBoardOwnership(list[0].boardId, req.user.userId);
    if (!ownsBoard) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this list'
      });
      return;
    }

    res.status(200).json({
      list: list[0]
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
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }

    const validatedData = createListSchema.parse(req.body);

    // Check if user owns the board
    const ownsBoard = await checkBoardOwnership(validatedData.boardId, req.user.userId);
    if (!ownsBoard) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this board'
      });
      return;
    }

    // If position not provided, get the next position
    let position = validatedData.position;
    if (position === undefined) {
      const existingLists = await db
        .select({ position: lists.position })
        .from(lists)
        .where(eq(lists.boardId, validatedData.boardId))
        .orderBy(lists.position);
      
      position = existingLists.length > 0 
        ? Math.max(...existingLists.map(l => l.position)) + 1 
        : 0;
    } else {
      // If position is provided, shift all lists at or after this position
      await db
        .update(lists)
        .set({ 
          position: sql`${lists.position} + 1`,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(lists.boardId, validatedData.boardId),
            gte(lists.position, position)
          )
        );
    }

    const newList = await db
      .insert(lists)
      .values({
        title: validatedData.title,
        boardId: validatedData.boardId,
        position: position
      })
      .returning({
        id: lists.id,
        title: lists.title,
        position: lists.position,
        boardId: lists.boardId,
        createdAt: lists.createdAt,
        updatedAt: lists.updatedAt
      });

    res.status(201).json({
      message: 'List created successfully',
      list: newList[0]
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
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }

    const listId = parseInt(req.params.id);

    if (isNaN(listId)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid list ID'
      });
      return;
    }

    const validatedData = updateListSchema.parse(req.body);

    // Check if list exists
    const existingList = await db
      .select()
      .from(lists)
      .where(eq(lists.id, listId))
      .limit(1);

    if (existingList.length === 0) {
      res.status(404).json({
        error: 'Not Found',
        message: 'List not found'
      });
      return;
    }

    // Check if user owns the board
    const ownsBoard = await checkBoardOwnership(existingList[0].boardId, req.user.userId);
    if (!ownsBoard) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to update this list'
      });
      return;
    }

    if (validatedData.position !== undefined) {
      const oldPosition = existingList[0].position;
      const newPosition = validatedData.position;

      if (oldPosition !== newPosition) {
        if (newPosition > oldPosition) {
          await db
            .update(lists)
            .set({ 
              position: sql`${lists.position} - 1`,
              updatedAt: new Date()
            })
            .where(
              and(
                eq(lists.boardId, existingList[0].boardId),
                gte(lists.position, oldPosition + 1),
                lte(lists.position, newPosition)
              )
            );
        } 
        else if (newPosition < oldPosition) {
          await db
            .update(lists)
            .set({ 
              position: sql`${lists.position} + 1`,
              updatedAt: new Date()
            })
            .where(
              and(
                eq(lists.boardId, existingList[0].boardId),
                gte(lists.position, newPosition),
                lte(lists.position, oldPosition - 1)
              )
            );
        }
      }
    }

    const updatedList = await db
      .update(lists)
      .set({
        ...(validatedData.title && { title: validatedData.title }),
        ...(validatedData.position !== undefined && { position: validatedData.position }),
        updatedAt: new Date()
      })
      .where(eq(lists.id, listId))
      .returning({
        id: lists.id,
        title: lists.title,
        position: lists.position,
        boardId: lists.boardId,
        createdAt: lists.createdAt,
        updatedAt: lists.updatedAt
      });

    res.status(200).json({
      message: 'List updated successfully',
      list: updatedList[0]
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
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }

    const listId = parseInt(req.params.id);

    if (isNaN(listId)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid list ID'
      });
      return;
    }

    // Check if list exists
    const existingList = await db
      .select()
      .from(lists)
      .where(eq(lists.id, listId))
      .limit(1);

    if (existingList.length === 0) {
      res.status(404).json({
        error: 'Not Found',
        message: 'List not found'
      });
      return;
    }

    // Check if user owns the board
    const ownsBoard = await checkBoardOwnership(existingList[0].boardId, req.user.userId);
    if (!ownsBoard) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to delete this list'
      });
      return;
    }

    const deletedPosition = existingList[0].position;
    const boardId = existingList[0].boardId;

    await db
      .delete(lists)
      .where(eq(lists.id, listId));

    await db
      .update(lists)
      .set({ 
        position: sql`${lists.position} - 1`,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(lists.boardId, boardId),
          gte(lists.position, deletedPosition + 1)
        )
      );

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

