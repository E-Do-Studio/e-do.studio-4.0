import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Même variante `bento` que Input — voir input.tsx pour le raisonnement.
const textareaVariants = cva(
  "flex w-full transition-colors outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "field-sizing-content min-h-16 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm",
        bento:
          "h-full resize-none border-0 bg-background px-5 py-4 font-sans text-cell font-light leading-normal tracking-copy-tight text-foreground placeholder:font-mono placeholder:text-label placeholder:font-normal placeholder:uppercase placeholder:tracking-widest placeholder:opacity-100 focus:bg-muted focus:placeholder:opacity-0 aria-invalid:text-destructive aria-invalid:placeholder:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Textarea({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"textarea"> & VariantProps<typeof textareaVariants>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(textareaVariants({ variant, className }))}
      {...props}
    />
  )
}

export { Textarea, textareaVariants }
