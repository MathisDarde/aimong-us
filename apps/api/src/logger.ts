type Level = 'info' | 'warn' | 'error'

const PARAMS_LINE = /^params:.*$/gm

function redact(text: string) {
  return text.replace(PARAMS_LINE, 'params: [redacted]')
}

function write(level: Level, message: string, fields: Record<string, unknown>) {
  const line = JSON.stringify({
    time: new Date().toISOString(),
    level,
    message: redact(message),
    ...fields,
  })
  const stream = level === 'info' ? process.stdout : process.stderr
  stream.write(`${line}\n`)
}

function serializeError(err: unknown) {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: redact(err.message),
      stack: err.stack && redact(err.stack),
    }
  }
  return { message: redact(String(err)) }
}

export function logInfo(message: string, fields: Record<string, unknown> = {}) {
  write('info', message, fields)
}

export function logWarn(message: string, fields: Record<string, unknown> = {}) {
  write('warn', message, fields)
}

export function logError(message: string, err: unknown, fields: Record<string, unknown> = {}) {
  write('error', message, { ...fields, error: serializeError(err) })
}
