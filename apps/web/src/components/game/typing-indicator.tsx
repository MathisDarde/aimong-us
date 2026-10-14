type TypingIndicatorProps = {
  names: string[]
}

function label(names: string[]) {
  if (names.length === 1) return `${names[0]} is typing`
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} are typing`
}

export function TypingIndicator({ names }: TypingIndicatorProps) {
  return (
    <p aria-live="polite" className="m-0 h-5 px-5 text-sm opacity-80">
      {names.length > 0 && (
        <>
          {label(names)}
          <span aria-hidden className="animate-pulse">
            …
          </span>
        </>
      )}
    </p>
  )
}
