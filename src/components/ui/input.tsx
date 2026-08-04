import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// La variante `bento` est la forme de champ du site : pas de bordure — la
// grille bento sépare par ses filets —, le champ remplit sa cellule, et le
// placeholder tient lieu de libellé (mono capitales, effacé au focus). Elle
// remplace la classe CSS `.edo-bento-input` et les wrappers maison
// `ContactInput` / `BentoInput`.
const inputVariants = cva(
  "w-full min-w-0 transition-colors outline-none placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm",
        bento:
          "h-full border-0 bg-background px-5 font-sans text-cell font-light tracking-copy-tight text-foreground placeholder:font-mono placeholder:text-label placeholder:font-normal placeholder:uppercase placeholder:tracking-widest placeholder:opacity-100 focus:bg-muted focus:placeholder:opacity-0 aria-invalid:text-destructive aria-invalid:placeholder:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Input({
  className,
  type,
  variant = "default",
  ...props
}: React.ComponentProps<"input"> & VariantProps<typeof inputVariants>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(inputVariants({ variant, className }))}
      {...props}
    />
  )
}

export { Input, inputVariants }
