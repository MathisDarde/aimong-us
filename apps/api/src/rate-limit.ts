export function createRateLimiter({ max, windowMs }: { max: number; windowMs: number }) {
  const hits = new Map<string, number[]>()

  setInterval(() => {
    const now = Date.now()
    for (const [key, timestamps] of hits) {
      if (now - timestamps[timestamps.length - 1] >= windowMs) hits.delete(key)
    }
  }, windowMs).unref()

  return function isRateLimited(key: string): boolean {
    const now = Date.now()
    const recent = (hits.get(key) ?? []).filter((timestamp) => now - timestamp < windowMs)
    const limited = recent.length >= max
    if (!limited) recent.push(now)
    hits.set(key, recent)
    return limited
  }
}
