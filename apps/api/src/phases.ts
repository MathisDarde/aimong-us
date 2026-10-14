import { randomInt } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { db } from './db/index.js'
import { games, players } from './db/schema.js'
import { currentTurnPlayerId, loadGameState, type Game } from './game-state.js'
import { logError } from './logger.js'
import { broadcast } from './rooms.js'
import { TURN_DURATION_MS } from './rules.js'
import { advanceTurn } from './turns.js'
import { advanceFromResults, castAiVote, everyoneVoted, resolveVoting } from './voting.js'

const AI_TURN_MIN_DELAY_MS = 2_000
const AI_TURN_MAX_DELAY_MS = 8_000
const AI_VOTE_MIN_DELAY_MS = 2_000
const AI_VOTE_MAX_DELAY_MS = 10_000

const phaseTimers = new Map<string, ReturnType<typeof setTimeout>>()

export function clearPhaseTimer(gameId: string) {
  clearTimeout(phaseTimers.get(gameId))
  phaseTimers.delete(gameId)
}

function armPhaseTimer(game: Game, delayMs: number, task: () => Promise<void>) {
  phaseTimers.set(
    game.id,
    setTimeout(() => {
      task().catch((err) => logError('phase timer failed', err, { gameId: game.id }))
    }, delayMs),
  )
}

function remainingMs(game: Game, fallbackMs: number) {
  return game.turnDeadline ? Math.max(0, game.turnDeadline.getTime() - Date.now()) : fallbackMs
}

async function resolveAndPublish(gameId: string, round: number) {
  const resolved = await resolveVoting(gameId, round)
  if (resolved) await publishPhaseChange(resolved)
}

async function scheduleTurn(game: Game) {
  const playerId = currentTurnPlayerId(game)
  if (!playerId) return

  const remaining = remainingMs(game, TURN_DURATION_MS)
  const speaker = await db.query.players.findFirst({ where: eq(players.id, playerId) })

  let delayMs = remaining
  if (speaker?.isAi) {
    delayMs = Math.min(remaining, randomInt(AI_TURN_MIN_DELAY_MS, AI_TURN_MAX_DELAY_MS + 1))
    broadcast(game.id, { type: 'typing', playerId })
  }

  armPhaseTimer(game, delayMs, async () => {
    const advanced = await advanceTurn(game.id, playerId)
    if (advanced) await publishPhaseChange(advanced)
  })
}

async function scheduleVoting(game: Game) {
  armPhaseTimer(game, remainingMs(game, 0), () => resolveAndPublish(game.id, game.round))

  const ais = await db.query.players.findMany({
    where: and(eq(players.gameId, game.id), eq(players.isAi, true), eq(players.isEliminated, false)),
  })
  for (const ai of ais) {
    const delayMs = Math.min(
      remainingMs(game, AI_VOTE_MAX_DELAY_MS),
      randomInt(AI_VOTE_MIN_DELAY_MS, AI_VOTE_MAX_DELAY_MS + 1),
    )
    setTimeout(() => {
      castAiVote(game.id, game.round, ai.id)
        .then((cast) => (cast ? handleVoteCast(game.id) : undefined))
        .catch((err) => logError('AI vote failed', err, { gameId: game.id }))
    }, delayMs)
  }
}

function scheduleResults(game: Game) {
  armPhaseTimer(game, remainingMs(game, 0), async () => {
    const next = await advanceFromResults(game)
    if (next) await publishPhaseChange(next)
  })
}

export async function schedulePhase(game: Game) {
  clearPhaseTimer(game.id)
  if (game.status === 'playing') return scheduleTurn(game)
  if (game.status === 'voting') return scheduleVoting(game)
  if (game.status === 'results') return scheduleResults(game)
}

export async function publishPhaseChange(game: Game) {
  broadcast(game.id, { type: 'game_state', state: await loadGameState(game) })
  await schedulePhase(game)
}

export async function ensurePhaseTimer(game: Game) {
  if (game.status !== 'lobby' && game.status !== 'finished' && !phaseTimers.has(game.id)) {
    await schedulePhase(game)
  }
}

export async function handleVoteCast(gameId: string) {
  const game = await db.query.games.findFirst({ where: eq(games.id, gameId) })
  if (!game) return
  broadcast(game.id, { type: 'game_state', state: await loadGameState(game) })
  if (game.status === 'voting' && (await everyoneVoted(game))) {
    await resolveAndPublish(game.id, game.round)
  }
}
