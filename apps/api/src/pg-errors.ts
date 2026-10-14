export const PG_NOT_NULL_VIOLATION = '23502'
export const PG_UNIQUE_VIOLATION = '23505'
export const PG_CHECK_VIOLATION = '23514'

export function pgErrorCode(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null) return undefined
  if ('code' in err && typeof err.code === 'string') return err.code
  return 'cause' in err ? pgErrorCode(err.cause) : undefined
}
