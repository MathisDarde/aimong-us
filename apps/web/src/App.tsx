import { useEffect, useState } from 'react'

type Health = { status: 'ok' | 'error'; db: boolean }

function App() {
  const [health, setHealth] = useState<Health | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json() as Promise<Health>)
      .then(setHealth)
      .catch(() => setHealth({ status: 'error', db: false }))
  }, [])

  return (
    <main className="app">
      <h1>Aimong Us</h1>
      <p>Des IA se cachent parmi vous. Discutez, soupçonnez, votez.</p>
      <p className="status">
        API : {health ? health.status : '…'} · Base de données :{' '}
        {health ? (health.db ? 'connectée' : 'non connectée') : '…'}
      </p>
    </main>
  )
}

export default App
