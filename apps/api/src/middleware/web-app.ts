import { serveStatic } from '@hono/node-server/serve-static'
import { createMiddleware } from 'hono/factory'
import { env } from '../env.js'

const API_PREFIX = '/api/'

function createWebAppMiddleware(root: string) {
  const files = serveStatic({ root })
  const indexHtml = serveStatic({ root, path: 'index.html' })

  return createMiddleware(async (c, next) => {
    if (c.req.path.startsWith(API_PREFIX)) return next()
    return files(c, async () => {
      const response = await indexHtml(c, next)
      if (response) c.res = response
    })
  })
}

const passThrough = createMiddleware((_c, next) => next())

export const webApp = env.STATIC_DIR ? createWebAppMiddleware(env.STATIC_DIR) : passThrough
