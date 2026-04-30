import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

type ButtonSize = 'sm' | 'default' | 'lg' | 'icon';
type ButtonVariant = 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

const sizeMap: Record<ButtonSize, string> = {
  sm: 'h-8 px-3',
  default: 'h-9 px-4',
  lg: 'h-10 px-6',
  icon: 'size-9 p-0',
};

const variantMap: Record<ButtonVariant, string> = {
  default: 'bg-primary text-primary-foreground hover:bg-foreground hover:text-white',
  outline: 'border border-foreground bg-background text-foreground hover:bg-muted',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-muted',
  ghost: 'bg-transparent text-foreground hover:bg-muted',
  link: 'bg-transparent p-0 text-primary underline underline-offset-1',
  destructive: 'bg-destructive text-primary-foreground',
};

const Button = ({
  variant = 'default',
  size = 'default',
  className,
  children,
  ...props
}: ButtonProps) => (
  <button
    className={cn(
      'edo-focus-ring inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap',
      'border-0 font-mono text-caption font-normal uppercase tracking-button leading-none',
      'rounded-none transition-[transform,color,background-color,border-color,opacity] duration-150 ease-edo-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40',
      sizeMap[size],
      variantMap[variant],
      className,
    )}
    {...props}
  >
    {children}
  </button>
);

export { Button };
export type { ButtonProps, ButtonSize, ButtonVariant };
