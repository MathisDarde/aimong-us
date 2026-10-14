import { randomInt } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "./db/index.js";
import { MAX_AIS, MAX_PLAYERS, MIN_AIS, games, players } from "./db/schema.js";
import { toPublicPlayer } from "./game-state.js";
import { logError } from "./logger.js";
import {
  PG_NOT_NULL_VIOLATION,
  PG_UNIQUE_VIOLATION,
  pgErrorCode,
} from "./pg-errors.js";
import { broadcast } from "./rooms.js";

const AI_NICKNAMES = [
  "Alex",
  "Sam",
  "Jordan",
  "Robin",
  "Charlie",
  "Morgan",
  "Casey",
  "Riley",
  "Jamie",
  "Taylor",
  "Quinn",
  "Avery",
];

const AI_ARRIVAL_MIN_GAP_MS = 3_000;
const AI_ARRIVAL_MAX_GAP_MS = 25_000;
const AI_SEAT_ATTEMPTS = 3;

export function pickAiNicknames(
  count: number,
  takenNicknames: string[],
): string[] {
  const taken = new Set(
    takenNicknames.map((nickname) => nickname.toLowerCase()),
  );
  const available = AI_NICKNAMES.filter(
    (nickname) => !taken.has(nickname.toLowerCase()),
  );
  const picked: string[] = [];
  while (picked.length < count && available.length > 0) {
    picked.push(...available.splice(randomInt(available.length), 1));
  }
  return picked;
}

export async function seatAiInLobby(gameId: string): Promise<void> {
  for (let attempt = 0; attempt < AI_SEAT_ATTEMPTS; attempt++) {
    const seated = await db.query.players.findMany({
      where: eq(players.gameId, gameId),
    });
    const [nickname] = pickAiNicknames(
      1,
      seated.map((player) => player.nickname),
    );
    if (!nickname) return;

    try {
      const [ai] = await db
        .insert(players)
        .values({
          gameId,
          nickname,
          isAi: true,
          seat: sql`(select max(s) from generate_series(1, ${MAX_PLAYERS}) s
            where s not in (select ${players.seat} from ${players} where ${players.gameId} = ${gameId})
            and exists (select 1 from ${games} where ${games.id} = ${gameId} and ${games.status} = 'lobby'))`,
        })
        .returning();
      broadcast(gameId, {
        type: "player_joined",
        player: toPublicPlayer(ai, true),
      });
      return;
    } catch (err) {
      const code = pgErrorCode(err);
      if (code === PG_NOT_NULL_VIOLATION) return;
      if (code !== PG_UNIQUE_VIOLATION) throw err;
    }
  }
}

export function scheduleAiArrivals(gameId: string) {
  const aiCount = randomInt(MIN_AIS, MAX_AIS + 1);
  let delay = 0;
  for (let index = 0; index < aiCount; index++) {
    delay += randomInt(AI_ARRIVAL_MIN_GAP_MS, AI_ARRIVAL_MAX_GAP_MS + 1);
    setTimeout(() => {
      seatAiInLobby(gameId).catch((err) =>
        logError("AI arrival failed", err, { gameId }),
      );
    }, delay);
  }
}
