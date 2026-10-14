import { clearAccessToken, getAccessToken } from '@/lib/auth-client'

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
  const token = await getAccessToken()
  const headers = new Headers(init?.headers)
  headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(path, { ...init, headers })
  const body: unknown = await response.json().catch(() => null)
  if (response.status === 401) clearAccessToken()
  if (!response.ok) throw new ApiError(errorMessage(body), response.status)
  return body as T
}
