import { cn } from './cn';

interface ToggleProps {
  on: boolean;
  onClick: () => void;
  className?: string;
}

const Toggle = ({ on, onClick, className }: ToggleProps) => (
  <button
    onClick={onClick}
    data-state={on ? 'checked' : 'unchecked'}
    className={cn('edo-toggle edo-focus-ring', className)}
  >
    <span className="edo-toggle-thumb" />
  </button>
);

export { Toggle };
export type { ToggleProps };
