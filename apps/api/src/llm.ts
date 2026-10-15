import { z } from 'zod'
import { env } from './env.js'

const LLM_TIMEOUT_MS = 10_000
const LLM_MAX_TOKENS = 300
const LLM_TEMPERATURE = 0.9

export type LlmMessage = { role: 'system' | 'user' | 'assistant'; content: string }

const completionSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string().nullable() }),
        finish_reason: z.string().nullish(),
      }),
    )
    .min(1),
})

export function isLlmConfigured(): boolean {
  return Boolean(env.AI_BASE_URL && env.AI_API_KEY)
}

export async function complete(messages: LlmMessage[]): Promise<string> {
  if (!isLlmConfigured()) throw new Error('The LLM is not configured')

  const response = await fetch(`${env.AI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${env.AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.AI_MODEL,
      messages,
      max_tokens: LLM_MAX_TOKENS,
      temperature: LLM_TEMPERATURE,
      reasoning_effort: 'none',
    }),
    signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`LLM request failed with status ${response.status}`)

  const [choice] = completionSchema.parse(await response.json()).choices
  if (choice.finish_reason === 'length') throw new Error('The LLM reply was truncated')
  return choice.message.content?.trim() ?? ''
}
