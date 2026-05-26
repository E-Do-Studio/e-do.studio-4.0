interface SocialIconProps {
  kind: string;
  size?: number;
}

const SocialIcon = ({ kind, size = 16 }: SocialIconProps) => {
  const sizeStyle = { width: size, height: size, minWidth: size, minHeight: size };
  const svgProps = {
    viewBox: '0 0 24 24',
    width: size,
    height: size,
    style: sizeStyle,
    className: 'block shrink-0',
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 1.4,
    preserveAspectRatio: 'xMidYMid meet' as const,
  };
  if (kind === 'instagram') return (<svg {...svgProps}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" /></svg>);
  if (kind === 'facebook') return (<svg {...svgProps}><path d="M14 7h3V4h-3c-2 0-3 1.5-3 3.5V10H8v3h3v8h3v-8h2.5l.5-3H14V8c0-.5.3-1 1-1Z" /></svg>);
  if (kind === 'linkedin') return (<svg {...svgProps}><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M7 10v7M7 7.5v0M11 17v-7M11 13c0-2 1-3 2.5-3s2.5 1 2.5 3v4" /></svg>);
  if (kind === 'tiktok') return (<svg {...svgProps}><path d="M15 4v9.5a3.5 3.5 0 1 1-3.5-3.5M15 4c0 2.5 2 4 4 4" /></svg>);
  return null;
};

export { SocialIcon };
export type { SocialIconProps };
