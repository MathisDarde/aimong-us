import { BrowserRouter, Route, Routes } from 'react-router'
import { RequireAuth } from '@/components/auth/require-auth'
import { ROUTES } from '@/lib/routes'
import { AuthPage } from '@/pages/auth'
import { LandingPage } from '@/pages/landing'
import { PlayPage } from '@/pages/play'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={ROUTES.home} element={<LandingPage />} />
        <Route path={ROUTES.auth} element={<AuthPage />} />
        <Route element={<RequireAuth />}>
          <Route path={ROUTES.play} element={<PlayPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
