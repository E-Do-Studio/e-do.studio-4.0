import * as React from"react"
import { Input as InputPrimitive } from"@base-ui/react/input"
import { cva, type VariantProps } from"class-variance-authority"

import { cn } from"@/lib/utils"

// La variante `bento` est la forme de champ du site : pas de bordure — la
// grille bento sépare par ses filets —, le champ remplit sa cellule, et le
// placeholder tient lieu de libellé (mono capitales, effacé au focus). Elle
// remplace la classe CSS `.` et les wrappers maison
// `ContactInput` / `BentoInput`.
const inputVariants = cva("w-full min-w-0 transition-colors placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
 {
 variants: {
 variant: {
 default:"h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-bold file:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm",
 // `focus:bg-muted` seul ne suffit pas comme repère de focus : blanc → #f5f5f5
 // ne fait que 1.04:1, invisible. Le tracé intérieur est le même que sur les
 // boutons, et il ne peut pas être rogné par la cellule bento voisine.
 bento:"h-full border-0 bg-background px-5 font-sans text-base tracking-tight text-foreground placeholder:font-mono placeholder:text-xs placeholder:font-normal placeholder:uppercase placeholder:tracking-widest placeholder:opacity-100 focus:bg-muted focus:placeholder:opacity-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground aria-invalid:text-destructive aria-invalid:placeholder:text-destructive",
 },
 },
 defaultVariants: {
 variant:"default",
 },
 }
)

function Input({
 className,
 type,
 variant ="default",
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
