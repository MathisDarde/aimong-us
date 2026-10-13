const FALLBACK_ERROR = 'Something went wrong, please try again.'

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function errorMessage(body: unknown): string {
  if (typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string') {
    return body.error
  }
  return FALLBACK_ERROR
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init)
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(errorMessage(body), response.status)
  return body as T
}
