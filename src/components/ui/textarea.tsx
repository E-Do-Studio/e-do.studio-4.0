import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Même variante `bento` que Input — voir input.tsx pour le raisonnement.
const textareaVariants = cva(
  "flex w-full transition-colors placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "field-sizing-content min-h-16 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm",
        // Voir input.tsx : `focus:bg-muted` seul ne fait que 1.04:1.
        bento:
          "h-full resize-none border-0 bg-background px-5 py-4 font-sans text-base leading-normal tracking-tight text-foreground placeholder:font-mono placeholder:text-xs placeholder:font-normal placeholder:uppercase placeholder:tracking-widest placeholder:opacity-100 focus:bg-muted focus:placeholder:opacity-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground aria-invalid:text-destructive aria-invalid:placeholder:text-destructive",
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
