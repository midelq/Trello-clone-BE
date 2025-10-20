import { pgTable, serial, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';


export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
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

export const usersRelations = relations(users, ({ many }) => ({
  boards: many(boards)
}));

export const boardsRelations = relations(boards, ({ one, many }) => ({
  owner: one(users, {
    fields: [boards.ownerId],
    references: [users.id]
  }),
  lists: many(lists)
}));

export const listsRelations = relations(lists, ({ one, many }) => ({
  board: one(boards, {
    fields: [lists.boardId],
    references: [boards.id]
  }),
  cards: many(cards)
}));

export const cardsRelations = relations(cards, ({ one }) => ({
  list: one(lists, {
    fields: [cards.listId],
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

