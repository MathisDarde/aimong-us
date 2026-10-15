import { z } from 'zod'
import { MAX_PLAYERS, gameStatus } from './db/schema.js'
import { CHAT_MAX_LENGTH, clientEventSchema, gameCodeParam } from './schemas.js'
import { REACTION_EMOJIS } from './reactions.js'

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` })

const json = (schema: object) => ({ content: { 'application/json': { schema } } })

const error = (description: string) => ({ description, ...json(ref('Error')) })

const UNAUTHORIZED = error('Missing, invalid or expired access token')
const INVALID_REQUEST = error('Invalid game code')
const GAME_NOT_FOUND = error('Game not found')
const NOT_A_PLAYER = error('You are not a player in this game')

const toJsonSchema = (schema: z.ZodType) => {
  const { $schema: _, ...rest } = z.toJSONSchema(schema)
  return rest
}

const codeParameter = {
  name: 'code',
  in: 'path',
  required: true,
  description: 'Game code, case-insensitive',
  schema: toJsonSchema(gameCodeParam.shape.code),
}

const nullable = (schema: object) => ({ oneOf: [schema, { type: 'null' }] })

const nullableString = { type: ['string', 'null'] }

const roleSchema = { type: ['string', 'null'], enum: ['ai', 'human', null] }

const gameAction = (summary: string, description: string, responses: Record<string, object>) => ({
  post: {
    tags: ['Games'],
    summary,
    description,
    parameters: [codeParameter],
    responses: {
      400: INVALID_REQUEST,
      401: UNAUTHORIZED,
      404: GAME_NOT_FOUND,
      ...responses,
    },
  },
})

const WEBSOCKET_DESCRIPTION = `Upgrades to a WebSocket. Swagger UI cannot open it; use a WebSocket client.

Browsers cannot set headers on a WebSocket, so the access token is sent as subprotocols: \`Sec-WebSocket-Protocol: bearer, <token>\`. The \`Origin\` header must match the web app origin. The socket is closed with code 1008 when the token expires.

**Client events** (JSON text frames):

\`\`\`json
${JSON.stringify(toJsonSchema(clientEventSchema), null, 2)}
\`\`\`

- \`chat\`: up to ${CHAT_MAX_LENGTH} characters. During \`playing\`, only the player whose turn it is can chat.
- \`vote\`: only during \`voting\`, once per round, never for yourself.
- \`react\`: toggles one of ${REACTION_EMOJIS.join(' ')} on a message.
- \`typing\`: broadcast to the room.

**Server events**: \`game_state\`, \`chat\`, \`player_joined\`, \`player_left\`, \`typing\`, \`reaction\`, \`error\`.`

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Aimong Us API',
    version: '0.0.0',
    description:
      'Game API. Authentication endpoints (sign-up, sign-in, token) are documented by Better Auth at [/api/auth/reference](/api/auth/reference). Get an access token from `GET /api/auth/token` and paste it in **Authorize**.',
  },
  servers: [{ url: '/' }],
  tags: [{ name: 'System' }, { name: 'User' }, { name: 'Games' }],
  security: [{ bearerAuth: [] }],
  paths: {
    '/api/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        security: [],
        responses: {
          200: {
            description: 'API status and database reachability',
            ...json({
              type: 'object',
              required: ['status', 'db'],
              properties: { status: { const: 'ok' }, db: { type: 'boolean' } },
            }),
          },
        },
      },
    },
    '/api/me': {
      get: {
        tags: ['User'],
        summary: 'Current user',
        responses: {
          200: {
            description: 'The authenticated user',
            ...json({
              type: 'object',
              required: ['id', 'name', 'email', 'image', 'createdAt'],
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string', format: 'email' },
                image: nullableString,
                createdAt: { type: 'string', format: 'date-time' },
              },
            }),
          },
          401: UNAUTHORIZED,
        },
      },
    },
    '/api/games': {
      post: {
        tags: ['Games'],
        summary: 'Create a game',
        description: 'Creates a lobby and seats the caller as host.',
        responses: {
          201: { description: 'Game created', ...json(ref('GameSession')) },
          401: UNAUTHORIZED,
          429: error('Too many games created, try again in a minute'),
        },
      },
    },
    '/api/games/{code}': {
      get: {
        tags: ['Games'],
        summary: 'Get a game',
        description:
          'Returns the game state. `me` and `messages` are only filled when the caller is a player.',
        parameters: [codeParameter],
        responses: {
          200: {
            description: 'Game state',
            ...json({
              type: 'object',
              required: ['state', 'me', 'messages'],
              properties: {
                state: ref('GameState'),
                me: { ...nullableString, format: 'uuid' },
                messages: { type: 'array', items: ref('Message') },
              },
            }),
          },
          400: INVALID_REQUEST,
          401: UNAUTHORIZED,
          404: GAME_NOT_FOUND,
        },
      },
    },
    '/api/games/{code}/join': gameAction(
      'Join a game',
      'Seats the caller in a lobby. Returns 200 when already seated.',
      {
        200: { description: 'Already seated', ...json(ref('GameSession')) },
        201: { description: 'Seated', ...json(ref('GameSession')) },
        409: error('The game has already started or is full'),
      },
    ),
    '/api/games/{code}/start': gameAction(
      'Start a game',
      'Host only. Fills the missing AI players and starts round 1.',
      {
        200: { description: 'Game started', ...json(ref('GameStateResponse')) },
        403: error('Not a player, or not the host'),
        409: error('Already started, not enough players, or the lobby changed'),
      },
    ),
    '/api/games/{code}/stop': gameAction('Stop a game', 'Host only. Ends the game without a winner.', {
      200: { description: 'Game stopped', ...json(ref('GameStateResponse')) },
      403: error('Not a player, or not the host'),
      409: error('The game is already over'),
    }),
    '/api/games/{code}/rematch': gameAction(
      'Create a rematch',
      'Creates (or returns) the rematch lobby of a finished game.',
      {
        200: {
          description: 'Rematch game code',
          ...json({
            type: 'object',
            required: ['code'],
            properties: { code: codeParameter.schema },
          }),
        },
        403: NOT_A_PLAYER,
        409: error('The game is not over yet'),
      },
    ),
    '/api/games/{code}/leave': gameAction(
      'Leave a game',
      'Leaves a lobby. When the host leaves, the game is stopped. No-op once the game has started.',
      {
        204: { description: 'Left' },
        403: NOT_A_PLAYER,
      },
    ),
    '/api/games/{code}/ws': {
      get: {
        tags: ['Games'],
        summary: 'Game WebSocket',
        description: WEBSOCKET_DESCRIPTION,
        parameters: [codeParameter],
        responses: {
          101: { description: 'Switching protocols' },
          400: INVALID_REQUEST,
          401: UNAUTHORIZED,
          403: error('Origin not allowed, or not a player'),
          404: GAME_NOT_FOUND,
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['error'],
        properties: { error: { type: 'string' }, requestId: { type: 'string' } },
      },
      PublicPlayer: {
        type: 'object',
        required: ['id', 'nickname', 'isEliminated', 'online', 'role'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          nickname: { type: 'string' },
          isEliminated: { type: 'boolean' },
          online: { type: 'boolean' },
          role: { ...roleSchema, description: 'Hidden (null) until revealed' },
        },
      },
      GameState: {
        type: 'object',
        required: [
          'game',
          'theme',
          'maxRounds',
          'lastResult',
          'players',
          'hostId',
          'minPlayersToStart',
          'maxPlayers',
          'votedPlayerIds',
          'rematchCode',
          'turn',
        ],
        properties: {
          game: {
            type: 'object',
            required: ['id', 'code', 'status', 'round', 'winner'],
            properties: {
              id: { type: 'string', format: 'uuid' },
              code: { type: 'string' },
              status: { type: 'string', enum: gameStatus.enumValues },
              round: { type: 'integer' },
              winner: { type: ['string', 'null'], enum: ['humans', 'ais', null] },
            },
          },
          theme: nullableString,
          maxRounds: { type: 'integer' },
          lastResult: nullable({
            type: 'object',
            required: ['eliminatedId', 'role'],
            properties: { eliminatedId: nullableString, role: roleSchema },
          }),
          players: { type: 'array', items: ref('PublicPlayer'), maxItems: MAX_PLAYERS },
          hostId: nullableString,
          minPlayersToStart: { type: 'integer' },
          maxPlayers: { type: 'integer' },
          votedPlayerIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
          rematchCode: nullableString,
          turn: {
            type: 'object',
            required: ['playerId', 'index', 'endsInMs'],
            properties: {
              playerId: nullableString,
              index: { type: 'integer' },
              endsInMs: { type: ['integer', 'null'] },
            },
          },
        },
      },
      GameStateResponse: {
        type: 'object',
        required: ['state'],
        properties: { state: ref('GameState') },
      },
      GameSession: {
        type: 'object',
        required: ['state', 'me'],
        properties: {
          state: ref('GameState'),
          me: { type: 'string', format: 'uuid', description: 'The caller player id' },
        },
      },
      Message: {
        type: 'object',
        required: ['id', 'playerId', 'content', 'createdAt', 'reactions'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          playerId: { type: 'string', format: 'uuid' },
          content: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          reactions: {
            type: 'array',
            items: {
              type: 'object',
              required: ['emoji', 'playerIds'],
              properties: {
                emoji: { type: 'string', enum: REACTION_EMOJIS },
                playerIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
              },
            },
          },
        },
      },
    },
  },
}
