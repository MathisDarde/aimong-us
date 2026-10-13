import { createMiddleware } from 'hono/factory'
import { logInfo } from '../logger.js'

export const accessLog = createMiddleware(async (c, next) => {
  const start = performance.now()
  await next()
  logInfo('request', {
    requestId: c.get('requestId'),
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    durationMs: Math.round(performance.now() - start),
  })
})
