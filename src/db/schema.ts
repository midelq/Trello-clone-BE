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

export const usersRelations = relations(users, ({ many }) => ({
  boards: many(boards)
}));

export const boardsRelations = relations(boards, ({ one }) => ({
  owner: one(users, {
    fields: [boards.ownerId],
    references: [users.id]
  })
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Board = typeof boards.$inferSelect;
export type NewBoard = typeof boards.$inferInsert;

