import { jwtClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

const REFRESH_MARGIN_MS = 30_000
const MS_PER_SECOND = 1000

type AccessToken = { value: string; expiresAt: number }

export const authClient = createAuthClient({ plugins: [jwtClient()] })

export const { useSession, signIn, signUp } = authClient

let cachedToken: AccessToken | null = null

function readExpiry(token: string): number {
  const payload: unknown = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
  if (typeof payload === 'object' && payload !== null && 'exp' in payload && typeof payload.exp === 'number') {
    return payload.exp * MS_PER_SECOND
  }
  return 0
}

export function clearAccessToken() {
  cachedToken = null
}

export async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt - Date.now() > REFRESH_MARGIN_MS) return cachedToken.value

  const { data, error } = await authClient.token()
  if (error || !data) throw new Error('Not authenticated')
  cachedToken = { value: data.token, expiresAt: readExpiry(data.token) }
  return data.token
}

export async function signOut() {
  clearAccessToken()
  return authClient.signOut()
}
