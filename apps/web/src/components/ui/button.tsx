import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 border-ink font-display font-semibold whitespace-nowrap text-ink no-underline transition-[transform,box-shadow] duration-75 outline-none hover:text-ink focus-visible:ring-[3px] focus-visible:ring-cyan/60 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default: "bg-jaune",
        secondary: "bg-cyan",
        accent: "bg-rose",
        success: "bg-menthe",
        ghost:
          "bg-ink !text-creme !shadow-none hover:!text-creme active:!translate-x-0.5 active:!translate-y-0.5",
        link: "border-0 !shadow-none text-cyan underline-offset-4 hover:underline",
      },
      size: {
        default:
          "rounded-[14px] border-3 px-[22px] py-3 text-lg shadow-hard-4 active:translate-x-1 active:translate-y-1 active:shadow-none",
        sm: "rounded-[14px] border-3 px-[18px] py-2.5 text-[17px] shadow-hard-4 active:translate-x-1 active:translate-y-1 active:shadow-none",
        lg: "rounded-[18px] border-4 px-7 py-4 text-[22px] shadow-hard-6 active:translate-x-1.5 active:translate-y-1.5 active:shadow-none",
        icon: "size-11 rounded-xl border-3 text-xl shadow-hard-3 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
