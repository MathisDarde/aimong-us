import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { signIn, signUp } from '@/lib/auth-client'
import { ROUTES } from '@/lib/routes'
import { AuthField } from './auth-field'

const NAME_MAX_LENGTH = 32
const PASSWORD_MIN_LENGTH = 10
const PASSWORD_MAX_LENGTH = 128
const FALLBACK_ERROR = 'Something went wrong, please try again.'

type Mode = 'sign-in' | 'sign-up'

const COPY: Record<Mode, { title: string; submit: string; switchPrompt: string; switchAction: string }> = {
  'sign-in': {
    title: 'Welcome back',
    submit: 'Sign in',
    switchPrompt: 'New here?',
    switchAction: 'Create an account',
  },
  'sign-up': {
    title: 'Join the party',
    submit: 'Sign up',
    switchPrompt: 'Already have an account?',
    switchAction: 'Sign in',
  },
}

export function AuthForm() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('sign-in')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const copy = COPY[mode]

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email'))
    const password = String(form.get('password'))

    setPending(true)
    setError(null)
    const { error: authError } =
      mode === 'sign-up'
        ? await signUp.email({ name: String(form.get('name')), email, password })
        : await signIn.email({ email, password })
    setPending(false)

    if (authError) {
      setError(authError.message ?? FALLBACK_ERROR)
      return
    }
    await navigate(ROUTES.play, { replace: true })
  }

  function toggleMode() {
    setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')
    setError(null)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-[440px] flex-col gap-5 rounded-[28px] border-4 border-ink bg-nuit-400 p-[clamp(20px,4vw,32px)] shadow-hard-10"
    >
      <h1 className="m-0 font-display text-4xl font-bold">{copy.title}</h1>

      {mode === 'sign-up' && (
        <AuthField
          label="Nickname"
          name="name"
          autoComplete="nickname"
          maxLength={NAME_MAX_LENGTH}
        />
      )}
      <AuthField label="Email" name="email" type="email" autoComplete="email" />
      <AuthField
        label="Password"
        name="password"
        type="password"
        autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
        minLength={PASSWORD_MIN_LENGTH}
        maxLength={PASSWORD_MAX_LENGTH}
      />

      {error && (
        <p role="alert" className="m-0 font-semibold text-rose">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'One sec…' : copy.submit}
      </Button>

      <p className="m-0 text-center text-sm">
        {copy.switchPrompt}{' '}
        <button
          type="button"
          onClick={toggleMode}
          className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-menthe underline"
        >
          {copy.switchAction}
        </button>
      </p>
    </form>
  )
}
