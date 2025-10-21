import { pgTable, serial, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';


export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  fullName: text('full_name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const boards = pgTable('boards', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  ownerId: integer('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const lists = pgTable('lists', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  position: integer('position').notNull().default(0),
  boardId: integer('board_id')
    .notNull()
    .references(() => boards.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const cards = pgTable('cards', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  position: integer('position').notNull().default(0),
  listId: integer('list_id')
    .notNull()
    .references(() => lists.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const activities = pgTable('activities', {
  id: serial('id').primaryKey(),
  type: text('type').notNull(), // 'card_created', 'card_moved', 'list_created', etc.
  description: text('description').notNull(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  boardId: integer('board_id')
    .notNull()
    .references(() => boards.id, { onDelete: 'cascade' }),
  cardId: integer('card_id')
    .references(() => cards.id, { onDelete: 'cascade' }),
  listId: integer('list_id')
    .references(() => lists.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const usersRelations = relations(users, ({ many }) => ({
  boards: many(boards),
  activities: many(activities)
}));

export const boardsRelations = relations(boards, ({ one, many }) => ({
  owner: one(users, {
    fields: [boards.ownerId],
    references: [users.id]
  }),
  lists: many(lists),
  activities: many(activities)
}));

export const listsRelations = relations(lists, ({ one, many }) => ({
  board: one(boards, {
    fields: [lists.boardId],
    references: [boards.id]
  }),
  cards: many(cards),
  activities: many(activities)
}));

export const cardsRelations = relations(cards, ({ one, many }) => ({
  list: one(lists, {
    fields: [cards.listId],
    references: [lists.id]
  }),
  activities: many(activities)
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(users, {
    fields: [activities.userId],
    references: [users.id]
  }),
  board: one(boards, {
    fields: [activities.boardId],
    references: [boards.id]
  }),
  card: one(cards, {
    fields: [activities.cardId],
    references: [cards.id]
  }),
  list: one(lists, {
    fields: [activities.listId],
    references: [lists.id]
  })
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Board = typeof boards.$inferSelect;
export type NewBoard = typeof boards.$inferInsert;

export type List = typeof lists.$inferSelect;
export type NewList = typeof lists.$inferInsert;

export type Card = typeof cards.$inferSelect;
export type NewCard = typeof cards.$inferInsert;

export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;

