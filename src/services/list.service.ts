import { db } from '../db';
import { lists } from '../db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

export class ListService {
    async findByBoardId(boardId: number) {
        return db
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
    }

    async findById(listId: number) {
        const result = await db
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

        return result[0] || null;
    }

    async create(data: { title: string, boardId: number, position?: number }) {
        return db.transaction(async (tx) => {
            let position = data.position;

            // If position not provided, get the next position
            if (position === undefined) {
                const existingLists = await tx
                    .select({ position: lists.position })
                    .from(lists)
                    .where(eq(lists.boardId, data.boardId))
                    .orderBy(lists.position);

                position = existingLists.length > 0
                    ? Math.max(...existingLists.map(l => l.position)) + 1
                    : 0;
            } else {
                // If position is provided, shift all lists at or after this position
                await tx
                    .update(lists)
                    .set({
                        position: sql`${lists.position} + 1`,
                        updatedAt: new Date()
                    })
                    .where(
                        and(
                            eq(lists.boardId, data.boardId),
                            gte(lists.position, position)
                        )
                    );
            }

            const [newList] = await tx
                .insert(lists)
                .values({
                    title: data.title,
                    boardId: data.boardId,
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

            return newList;
        });
    }

    async update(listId: number, data: { title?: string, position?: number }) {
        return db.transaction(async (tx) => {
            // Get existing list to know current position and boardId
            const [existingList] = await tx
                .select()
                .from(lists)
                .where(eq(lists.id, listId))
                .limit(1);

            if (!existingList) return null;

            const boardId = existingList.boardId;

            if (data.position !== undefined) {
                const oldPosition = existingList.position;
                const newPosition = data.position;

                if (oldPosition !== newPosition) {
                    if (newPosition > oldPosition) {
                        // Moving down: shift items between old and new position UP (-1)
                        await tx
                            .update(lists)
                            .set({
                                position: sql`${lists.position} - 1`,
                                updatedAt: new Date()
                            })
                            .where(
                                and(
                                    eq(lists.boardId, boardId),
                                    gte(lists.position, oldPosition + 1),
                                    lte(lists.position, newPosition)
                                )
                            );
                    }
                    else if (newPosition < oldPosition) {
                        // Moving up: shift items between new and old position DOWN (+1)
                        await tx
                            .update(lists)
                            .set({
                                position: sql`${lists.position} + 1`,
                                updatedAt: new Date()
                            })
                            .where(
                                and(
                                    eq(lists.boardId, boardId),
                                    gte(lists.position, newPosition),
                                    lte(lists.position, oldPosition - 1)
                                )
                            );
                    }
                }
            }

            const [updatedList] = await tx
                .update(lists)
                .set({
                    ...(data.title && { title: data.title }),
                    ...(data.position !== undefined && { position: data.position }),
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

            return updatedList;
        });
    }

    async delete(listId: number): Promise<boolean> {
        return db.transaction(async (tx) => {
            const [existingList] = await tx
                .select()
                .from(lists)
                .where(eq(lists.id, listId))
                .limit(1);

            if (!existingList) return false;

            const deletedPosition = existingList.position;
            const boardId = existingList.boardId;

            await tx
                .delete(lists)
                .where(eq(lists.id, listId));

            await tx
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

            return true;
        });
    }
}

export const listService = new ListService();
