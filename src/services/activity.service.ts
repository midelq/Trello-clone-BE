import { db } from '../db';
import { activities } from '../db/schema';
import { eq } from 'drizzle-orm';

export type ActivityType =
    | 'board_created'
    | 'board_updated'
    | 'board_deleted'
    | 'list_created'
    | 'list_updated'
    | 'list_deleted'
    | 'card_created'
    | 'card_moved'
    | 'card_updated'
    | 'card_deleted';

export class ActivityService {
    async logActivity(params: {
        type: ActivityType;
        description: string;
        userId: number;
        boardId: number;
        listId?: number;
        cardId?: number;
    }) {
        await db.insert(activities).values(params);
    }

    async getActivitiesByBoard(boardId: number, limit = 50) {
        return db.select()
            .from(activities)
            .where(eq(activities.boardId, boardId))
            .orderBy(activities.createdAt)
            .limit(limit);

    }
}

export const activityService = new ActivityService();
