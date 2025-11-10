import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { cards, lists, boards } from '../db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

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

// Helper function to check if user owns the board that contains the list
const checkListOwnership = async (listId: number, userId: number): Promise<boolean> => {
  const result = await db
    .select({ boardId: lists.boardId, ownerId: boards.ownerId })
    .from(lists)
    .innerJoin(boards, eq(lists.boardId, boards.id))
    .where(eq(lists.id, listId))
    .limit(1);
  
  return result.length > 0 && result[0].ownerId === userId;
};

// Get all cards for a specific list
export const getCardsByList = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }

    const listId = parseInt(req.params.listId);

    if (isNaN(listId)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid list ID'
      });
      return;
    }

    // Check if user owns the list's board
    const ownsList = await checkListOwnership(listId, req.user.userId);
    if (!ownsList) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this list'
      });
      return;
    }

    const listCards = await db
      .select({
        id: cards.id,
        title: cards.title,
        description: cards.description,
        position: cards.position,
        listId: cards.listId,
        createdAt: cards.createdAt,
        updatedAt: cards.updatedAt
      })
      .from(cards)
      .where(eq(cards.listId, listId))
      .orderBy(cards.position);

    res.status(200).json({
      cards: listCards,
      count: listCards.length
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
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }

    const cardId = parseInt(req.params.id);

    if (isNaN(cardId)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid card ID'
      });
      return;
    }

    const card = await db
      .select({
        id: cards.id,
        title: cards.title,
        description: cards.description,
        position: cards.position,
        listId: cards.listId,
        createdAt: cards.createdAt,
        updatedAt: cards.updatedAt
      })
      .from(cards)
      .where(eq(cards.id, cardId))
      .limit(1);

    if (card.length === 0) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Card not found'
      });
      return;
    }

    // Check if user owns the board that contains this card's list
    const ownsList = await checkListOwnership(card[0].listId, req.user.userId);
    if (!ownsList) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this card'
      });
      return;
    }

    res.status(200).json({
      card: card[0]
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
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }

    const validatedData = createCardSchema.parse(req.body);

    // Check if user owns the list's board
    const ownsList = await checkListOwnership(validatedData.listId, req.user.userId);
    if (!ownsList) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this list'
      });
      return;
    }

    // If position not provided, get the next position
    let position = validatedData.position;
    if (position === undefined) {
      const existingCards = await db
        .select({ position: cards.position })
        .from(cards)
        .where(eq(cards.listId, validatedData.listId))
        .orderBy(cards.position);
      
      position = existingCards.length > 0 
        ? Math.max(...existingCards.map(c => c.position)) + 1 
        : 0;
    } else {
      // If position is provided, shift all cards at or after this position
      await db
        .update(cards)
        .set({ 
          position: sql`${cards.position} + 1`,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(cards.listId, validatedData.listId),
            gte(cards.position, position)
          )
        );
    }

    const newCard = await db
      .insert(cards)
      .values({
        title: validatedData.title,
        description: validatedData.description,
        listId: validatedData.listId,
        position: position
      })
      .returning({
        id: cards.id,
        title: cards.title,
        description: cards.description,
        position: cards.position,
        listId: cards.listId,
        createdAt: cards.createdAt,
        updatedAt: cards.updatedAt
      });

    res.status(201).json({
      message: 'Card created successfully',
      card: newCard[0]
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
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }

    const cardId = parseInt(req.params.id);

    if (isNaN(cardId)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid card ID'
      });
      return;
    }

    const validatedData = updateCardSchema.parse(req.body);

    // Check if card exists
    const existingCard = await db
      .select()
      .from(cards)
      .where(eq(cards.id, cardId))
      .limit(1);

    if (existingCard.length === 0) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Card not found'
      });
      return;
    }

    // Check if user owns the board
    const ownsList = await checkListOwnership(existingCard[0].listId, req.user.userId);
    if (!ownsList) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to update this card'
      });
      return;
    }

    // If moving to a different list
    if (validatedData.listId && validatedData.listId !== existingCard[0].listId) {
      // Check if user owns the new list's board
      const ownsNewList = await checkListOwnership(validatedData.listId, req.user.userId);
      if (!ownsNewList) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have access to the target list'
        });
        return;
      }

      // Remove card from old list (shift positions)
      await db
        .update(cards)
        .set({ 
          position: sql`${cards.position} - 1`,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(cards.listId, existingCard[0].listId),
            gte(cards.position, existingCard[0].position + 1)
          )
        );

      // Add card to new list at specified position or at the end
      let newPosition = validatedData.position;
      if (newPosition === undefined) {
        const existingCards = await db
          .select({ position: cards.position })
          .from(cards)
          .where(eq(cards.listId, validatedData.listId))
          .orderBy(cards.position);
        
        newPosition = existingCards.length > 0 
          ? Math.max(...existingCards.map(c => c.position)) + 1 
          : 0;
      } else {
        // Shift cards in new list to make room
        await db
          .update(cards)
          .set({ 
            position: sql`${cards.position} + 1`,
            updatedAt: new Date()
          })
          .where(
            and(
              eq(cards.listId, validatedData.listId),
              gte(cards.position, newPosition)
            )
          );
      }

      validatedData.position = newPosition;
    } 
    // If changing position within the same list
    else if (validatedData.position !== undefined && !validatedData.listId) {
      const oldPosition = existingCard[0].position;
      const newPosition = validatedData.position;

      if (oldPosition !== newPosition) {
        if (newPosition > oldPosition) {
          await db
            .update(cards)
            .set({ 
              position: sql`${cards.position} - 1`,
              updatedAt: new Date()
            })
            .where(
              and(
                eq(cards.listId, existingCard[0].listId),
                gte(cards.position, oldPosition + 1),
                lte(cards.position, newPosition)
              )
            );
        } 
        else if (newPosition < oldPosition) {
          await db
            .update(cards)
            .set({ 
              position: sql`${cards.position} + 1`,
              updatedAt: new Date()
            })
            .where(
              and(
                eq(cards.listId, existingCard[0].listId),
                gte(cards.position, newPosition),
                lte(cards.position, oldPosition - 1)
              )
            );
        }
      }
    }

    const updatedCard = await db
      .update(cards)
      .set({
        ...(validatedData.title && { title: validatedData.title }),
        ...(validatedData.description !== undefined && { description: validatedData.description }),
        ...(validatedData.position !== undefined && { position: validatedData.position }),
        ...(validatedData.listId && { listId: validatedData.listId }),
        updatedAt: new Date()
      })
      .where(eq(cards.id, cardId))
      .returning({
        id: cards.id,
        title: cards.title,
        description: cards.description,
        position: cards.position,
        listId: cards.listId,
        createdAt: cards.createdAt,
        updatedAt: cards.updatedAt
      });

    res.status(200).json({
      message: 'Card updated successfully',
      card: updatedCard[0]
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
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }

    const cardId = parseInt(req.params.id);

    if (isNaN(cardId)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid card ID'
      });
      return;
    }

    // Check if card exists
    const existingCard = await db
      .select()
      .from(cards)
      .where(eq(cards.id, cardId))
      .limit(1);

    if (existingCard.length === 0) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Card not found'
      });
      return;
    }

    // Check if user owns the board
    const ownsList = await checkListOwnership(existingCard[0].listId, req.user.userId);
    if (!ownsList) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to delete this card'
      });
      return;
    }

    const deletedPosition = existingCard[0].position;
    const listId = existingCard[0].listId;

    await db
      .delete(cards)
      .where(eq(cards.id, cardId));

    // Shift remaining cards
    await db
      .update(cards)
      .set({ 
        position: sql`${cards.position} - 1`,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(cards.listId, listId),
          gte(cards.position, deletedPosition + 1)
        )
      );

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

