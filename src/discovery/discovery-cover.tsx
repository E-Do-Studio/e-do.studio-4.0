import React from 'react';

type CoverTone = 'mono' | 'dark' | 'warm';

interface CoverPalette {
  bgClass: string;
  a: string;
  b: string;
}

const COVER_PALETTES: Record<CoverTone, CoverPalette> = {
  mono:{bgClass:'bg-muted', a:'#141414', b:'#bcbcbc'},
  dark:{bgClass:'bg-foreground', a:'#f3d9b6', b:'#3a3a3a'},
  warm:{bgClass:'bg-edo-warm', a:'#141414', b:'#c4b594'},
};

interface DiscoveryCoverProps {
  tone?: string;
  seed?: number;
}

export const DiscoveryCover: React.FC<DiscoveryCoverProps> = ({ tone = 'mono', seed = 0 }) => {
  const palette = COVER_PALETTES[tone as CoverTone] || COVER_PALETTES.mono;
  const layout = seed % 6;

  return (
    <div className={`relative h-full w-full overflow-hidden ${palette.bgClass}`}>
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        {layout === 0 && <><rect x="40" y="40" width="320" height="220" fill={palette.b}/><circle cx="200" cy="150" r="60" fill={palette.a}/></>}
        {layout === 1 && <><rect x="0" y="200" width="400" height="120" fill={palette.b}/><rect x="150" y="60" width="100" height="200" fill={palette.a}/></>}
        {layout === 2 && <><path d="M0 300 Q200 60 400 300 Z" fill={palette.b}/><circle cx="200" cy="120" r="46" fill={palette.a}/></>}
        {layout === 3 && <><g stroke={palette.b} strokeWidth="14" fill="none"><line x1="-20" y1="80" x2="420" y2="80"/><line x1="-20" y1="160" x2="420" y2="160"/><line x1="-20" y1="240" x2="420" y2="240"/></g><rect x="170" y="120" width="60" height="60" fill={palette.a}/></>}
        {layout === 4 && <><circle cx="120" cy="150" r="100" fill={palette.b}/><circle cx="270" cy="150" r="64" fill={palette.a} opacity=".88"/></>}
        {layout === 5 && <><rect x="0" y="0" width="200" height="300" fill={palette.b}/><path d="M200 0 L400 300 L200 300 Z" fill={palette.a}/></>}
      </svg>
    </div>
  );
};
