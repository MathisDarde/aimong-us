import { useId, type ComponentProps } from 'react'

type AuthFieldProps = Omit<ComponentProps<'input'>, 'id'> & {
  label: string
}

export function AuthField({ label, ...props }: AuthFieldProps) {
  const id = useId()

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        required
        className="rounded-[14px] border-3 border-ink bg-creme px-4 py-2.5 text-base text-ink shadow-hard-3 outline-0 focus-visible:ring-[3px] focus-visible:ring-cyan/60"
        {...props}
      />
    </div>
  )
}
