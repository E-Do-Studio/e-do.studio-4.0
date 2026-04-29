import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from './cn';

interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onChange?: (value: string) => void;
}

const Input = ({ onChange, className, ...props }: InputProps) => (
  <input
    onChange={(e) => onChange?.(e.target.value)}
    className={cn(
      'edo-focus-ring w-full border-0 text-foreground outline-none placeholder:text-muted-foreground',
      className,
    )}
    {...props}
  />
);

interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  onChange?: (value: string) => void;
}

const Textarea = ({ onChange, className, ...props }: TextareaProps) => (
  <textarea
    onChange={(e) => onChange?.(e.target.value)}
    className={cn(
      'edo-focus-ring w-full border-0 text-foreground outline-none placeholder:text-muted-foreground',
      className,
    )}
    {...props}
  />
);

export { Input, Textarea };
export type { InputProps, TextareaProps };
