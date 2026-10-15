import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { APIError } from 'better-auth/api'
import { jwt, openAPI } from 'better-auth/plugins'
import { db } from './db/index.js'
import { account, jwks, rateLimit, session, user, verification } from './db/schema.js'
import { env } from './env.js'
import { logError, logInfo, logWarn } from './logger.js'

const NAME_MAX_LENGTH = 32
const ACCESS_TOKEN_TTL = '15m'

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  basePath: '/api/auth',
  trustedOrigins: [env.WEB_ORIGIN],
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user, session, account, verification, jwks, rateLimit },
  }),
  plugins: [
    openAPI(),
    jwt({
      jwt: {
        expirationTime: ACCESS_TOKEN_TTL,
        definePayload: ({ user }) => ({ name: user.name }),
      },
      disableSettingJwtHeader: true,
    }),
  ],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    autoSignIn: true,
    revokeSessionsOnPasswordReset: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    enabled: true,
    storage: 'database',
    window: 60,
    max: 100,
    customRules: {
      '/sign-in/email': { window: 60, max: 5 },
      '/sign-up/email': { window: 60 * 60, max: 5 },
      '/change-password': { window: 60, max: 5 },
    },
  },
  advanced: {
    ipAddress: {
      ipAddressHeaders: ['x-forwarded-for'],
      trustedProxies: env.TRUSTED_PROXIES,
    },
    useSecureCookies: env.isProduction,
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.isProduction,
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (data) => {
          const name = data.name.trim()
          if (!name || name.length > NAME_MAX_LENGTH) {
            throw new APIError('BAD_REQUEST', {
              message: `Nickname must be between 1 and ${NAME_MAX_LENGTH} characters`,
            })
          }
          return { data: { ...data, name, email: data.email.trim().toLowerCase() } }
        },
      },
      update: {
        before: async (data) => {
          if (data.name === undefined) return { data }
          const name = data.name.trim()
          if (!name || name.length > NAME_MAX_LENGTH) {
            throw new APIError('BAD_REQUEST', {
              message: `Nickname must be between 1 and ${NAME_MAX_LENGTH} characters`,
            })
          }
          return { data: { ...data, name } }
        },
      },
    },
  },
  logger: {
    level: 'warn',
    log: (level, message, ...details) => {
      if (level === 'error') logError(message, details[0])
      else if (level === 'warn') logWarn(message)
      else logInfo(message)
    },
  },
  telemetry: { enabled: false },
})
