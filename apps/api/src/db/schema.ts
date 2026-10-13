import { boolean, integer, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

export const gameStatus = pgEnum('game_status', ['lobby', 'playing', 'voting', 'finished'])

/** Une partie : un salon de chat avec un code à partager */
export const games = pgTable('games', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 8 }).notNull().unique(),
  status: gameStatus('status').notNull().default('lobby'),
  round: integer('round').notNull().default(0),
  winner: varchar('winner', { length: 16 }), // 'humans' | 'ais'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/** Joueurs d'une partie, humains ou IA imposteurs */
export const players = pgTable('players', {
  id: uuid('id').primaryKey().defaultRandom(),
  gameId: uuid('game_id')
    .notNull()
    .references(() => games.id, { onDelete: 'cascade' }),
  nickname: varchar('nickname', { length: 32 }).notNull(),
  isAi: boolean('is_ai').notNull().default(false),
  persona: text('persona'), // prompt de personnalité pour les IA
  isEliminated: boolean('is_eliminated').notNull().default(false),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
})

/** Messages du chat */
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  gameId: uuid('game_id')
    .notNull()
    .references(() => games.id, { onDelete: 'cascade' }),
  playerId: uuid('player_id')
    .notNull()
    .references(() => players.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/** Votes d'élimination, un par joueur et par manche */
export const votes = pgTable('votes', {
  id: uuid('id').primaryKey().defaultRandom(),
  gameId: uuid('game_id')
    .notNull()
    .references(() => games.id, { onDelete: 'cascade' }),
  round: integer('round').notNull(),
  voterId: uuid('voter_id')
    .notNull()
    .references(() => players.id, { onDelete: 'cascade' }),
  targetId: uuid('target_id')
    .notNull()
    .references(() => players.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
