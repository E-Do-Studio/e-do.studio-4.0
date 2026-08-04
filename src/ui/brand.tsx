import { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';
import logoFull from '../../brand/logo-full.webp';
import logoMark from '../../brand/logo-mark.webp';
import { useT } from '../i18n/use-t';

interface WordmarkProps {
  size?: 32 | 40;
  variant?: 'full' | 'mark';
}

const sizeMap: Record<number, string> = {
  32: 'h-8',
  40: 'h-10',
};

// Intrinsic dimensions are required to reserve layout space and avoid CLS.
const NATURAL: Record<'full' | 'mark', { width: number; height: number }> = {
  full: { width: 600, height: 228 },
  mark: { width: 240, height: 240 },
};

const Wordmark = ({ size = 40, variant = 'full' }: WordmarkProps) => {
  const { width, height } = NATURAL[variant];
  return (
    <img
      src={variant === 'mark' ? logoMark : logoFull}
      alt="E-Do Studio"
      width={width}
      height={height}
      decoding="async"
      // aspect-ratio + object-contain guard against parents that would otherwise stretch the bitmap.
      style={{ aspectRatio: `${width} / ${height}` }}
      className={`${sizeMap[size] ?? 'h-10'} block w-auto max-w-full shrink-0 object-contain`}
    />
  );
};

interface LangSwitchProps {
  onToggle: () => void;
}

const LangSwitch = ({ onToggle }: LangSwitchProps) => {
  const t = useT();
  return (
    <button
      onClick={onToggle}
      className="edo-focus-ring flex h-full cursor-pointer flex-col items-center justify-center gap-1 border-0 bg-background transition-colors duration-150 hover:bg-muted"
    >
      <Globe width="14" height="14" />
      <div className="flex items-center gap-0.5 font-mono text-micro font-medium text-muted-foreground">
        <span>{t('common.langToggleLabel')}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
        <span>{t('common.langToggleLabel')}</span>
      </div>
    </button>
  );
};

const Clock = () => {
  const [t, setT] = useState(new Date());
  useEffect(() => {
    const i = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(i);
  }, []);
  const h = t.getHours(),
    m = t.getMinutes(),
    s = t.getSeconds();
  const hourDeg = (h % 12) * 30 + m * 0.5,
    minDeg = m * 6,
    secDeg = s * 6;
  return (
    <div className="flex flex-col items-center justify-center py-2.5">
      <svg viewBox="0 0 100 100" width="30" height="30">
        {[...Array(12)].map((_, i) => {
          const a = ((i * 30 - 90) * Math.PI) / 180;
          return (
            <line
              key={i}
              x1={50 + 42 * Math.cos(a)}
              y1={50 + 42 * Math.sin(a)}
              x2={50 + 46 * Math.cos(a)}
              y2={50 + 46 * Math.sin(a)}
              stroke="currentColor"
              strokeWidth="1.5"
            />
          );
        })}
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="26"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          transform={`rotate(${hourDeg},50,50)`}
        />
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          transform={`rotate(${minDeg},50,50)`}
        />
        <line
          x1="50"
          y1="55"
          x2="50"
          y2="16"
          stroke="var(--primary)"
          strokeWidth="1"
          strokeLinecap="round"
          transform={`rotate(${secDeg},50,50)`}
        />
        <circle cx="50" cy="50" r="2.5" fill="currentColor" />
      </svg>
      <span className="mt-0.5 font-mono text-nano text-muted-foreground tabular-nums">
        {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}
      </span>
      <span className="mt-px font-mono text-nano uppercase tracking-label text-muted-foreground">
        Paris
      </span>
    </div>
  );
};

export { Wordmark, LangSwitch, Clock };
export type { WordmarkProps, LangSwitchProps };
