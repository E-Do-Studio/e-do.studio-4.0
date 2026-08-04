import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Swiss bento grid. The 1px rules between cells are the grid's own background
// showing through its gutters — `gap-px` over `bg-border`, with each cell
// opaque. No borders, no descendant selectors, and nothing that redefines
// Tailwind's own utilities.
//
// A cell that should merge with its neighbour says so with `colSpan`/`rowSpan`
// rather than cancelling a border its parent drew.

const bentoGridVariants = cva("grid gap-px bg-border", {
  variants: {
    /** Outer 1px frame. Off by default — most grids sit flush in a page. */
    framed: {
      true: "p-px",
      false: "",
    },
  },
  defaultVariants: {
    framed: false,
  },
})

function BentoGrid({
  className,
  framed,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof bentoGridVariants>) {
  return (
    <div
      data-slot="bento-grid"
      className={cn(bentoGridVariants({ framed, className }))}
      {...props}
    />
  )
}

const bentoCellVariants = cva("min-w-0 bg-background", {
  variants: {
    /** Inverts the cell's tokens — see the `.dark` block in styles.css. */
    tone: {
      default: "",
      inverted: "dark bg-background text-foreground",
      accent: "bg-primary text-primary-foreground",
    },
    padded: {
      true: "p-4",
      false: "",
    },
  },
  defaultVariants: {
    tone: "default",
    padded: false,
  },
})

function BentoCell({
  className,
  tone,
  padded,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof bentoCellVariants>) {
  return (
    <div
      data-slot="bento-cell"
      className={cn(bentoCellVariants({ tone, padded, className }))}
      {...props}
    />
  )
}

export { BentoGrid, BentoCell, bentoGridVariants, bentoCellVariants }
