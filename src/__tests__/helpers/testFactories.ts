import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../db';
import { users, boards, lists, cards } from '../../db/schema';
import type { User, Board, List, Card } from '../../db/schema';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

export async function createTestUser(overrides?: {
  fullName?: string;
  email?: string;
  password?: string;
}): Promise<User> {
  const hashedPassword = await bcrypt.hash(overrides?.password || 'password123', 10);
  
  const [user] = await db.insert(users).values({
    fullName: overrides?.fullName || 'Test User',
    email: overrides?.email || `testuser${Date.now()}@example.com`,
    password: hashedPassword,
  }).returning();
  
  return user;
}


export async function createTestBoard(
  ownerId: number,
  overrides?: { title?: string }
): Promise<Board> {
  const [board] = await db.insert(boards).values({
    title: overrides?.title || 'Test Board',
    ownerId,
  }).returning();
  
  return board;
}

/**
 * Create a test list
 */
export async function createTestList(
  boardId: number,
  overrides?: { title?: string; position?: number }
): Promise<List> {
  const [list] = await db.insert(lists).values({
    title: overrides?.title || 'Test List',
    position: overrides?.position ?? 0,
    boardId,
  }).returning();
  
  return list;
}

/**
 * Create a test card
 */
export async function createTestCard(
  listId: number,
  overrides?: {
    title?: string;
    description?: string;
    position?: number;
  }
): Promise<Card> {
  const [card] = await db.insert(cards).values({
    title: overrides?.title || 'Test Card',
    description: overrides?.description || null,
    position: overrides?.position ?? 0,
    listId,
  }).returning();
  
  return card;
}

/**
 * Generate JWT token for test user
 */
export function generateTestToken(userId: number, email: string): string {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

/**
 * Create a complete test setup (user, board, list)
 */
export async function createTestSetup(options?: {
  userEmail?: string;
  boardTitle?: string;
  listTitle?: string;
}): Promise<{
  user: User;
  board: Board;
  list: List;
  token: string;
}> {
  const user = await createTestUser({ email: options?.userEmail });
  const board = await createTestBoard(user.id, { title: options?.boardTitle });
  const list = await createTestList(board.id, { title: options?.listTitle });
  const token = generateTestToken(user.id, user.email);
  
  return { user, board, list, token };
}

/**
 * Create multiple cards in a list
 */
export async function createMultipleCards(
  listId: number,
  count: number
): Promise<Card[]> {
  const cards: Card[] = [];
  
  for (let i = 0; i < count; i++) {
    const card = await createTestCard(listId, {
      title: `Card ${i + 1}`,
      position: i,
    });
    cards.push(card);
  }
  
  return cards;
}

