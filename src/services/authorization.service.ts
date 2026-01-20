import { db } from '../db';
import { boards, lists, cards } from '../db/schema';
import { eq } from 'drizzle-orm';

export class AuthorizationService {
    async canAccessBoard(boardId: number, userId: number): Promise<boolean> {
        const [board] = await db
            .select({ ownerId: boards.ownerId })
            .from(boards)
            .where(eq(boards.id, boardId))
            .limit(1);

        return board?.ownerId === userId;
    }

    async canAccessList(listId: number, userId: number): Promise<boolean> {
        const [result] = await db
            .select({ ownerId: boards.ownerId })
            .from(lists)
            .innerJoin(boards, eq(lists.boardId, boards.id))
            .where(eq(lists.id, listId))
            .limit(1);

        return result?.ownerId === userId;
    }

    async canAccessCard(cardId: number, userId: number): Promise<boolean> {
        const [result] = await db
            .select({ ownerId: boards.ownerId })
            .from(cards)
            .innerJoin(lists, eq(cards.listId, lists.id))
            .innerJoin(boards, eq(lists.boardId, boards.id))
            .where(eq(cards.id, cardId))
            .limit(1);

        return result?.ownerId === userId;
    }
}

export const authorizationService = new AuthorizationService();
