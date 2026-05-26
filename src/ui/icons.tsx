import type { SVGProps } from 'react';

interface IconProps extends SVGProps<SVGSVGElement> {
  width?: string | number;
  height?: string | number;
}

const defaults: IconProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const IconMenu = (props: IconProps) => (
  <svg {...defaults} {...props}>
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="18" x2="20" y2="18" />
  </svg>
);

const IconX = (props: IconProps) => (
  <svg {...defaults} {...props}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconArrowRight = (props: IconProps) => (
  <svg {...defaults} {...props}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

const IconGlobe = (props: IconProps) => (
  <svg {...defaults} {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const IconPlay = (props: IconProps) => (
  <svg {...defaults} {...props}>
    <polygon points="6 4 20 12 6 20 6 4" />
  </svg>
);

const IconChat = (props: IconProps) => (
  <svg {...defaults} {...props}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const IconLock = (props: IconProps) => (
  <svg {...defaults} {...props}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

const IconChevronDown = (props: IconProps) => (
  <svg {...defaults} {...props}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

// Up/down chevrons stacked — the standard "tap to pick from a list" affordance
// used by native picker fields. Distinct from `IconArrowRight` (linear next).
const IconSelector = (props: IconProps) => (
  <svg {...defaults} {...props}>
    <path d="m8 9 4-4 4 4" />
    <path d="m8 15 4 4 4-4" />
  </svg>
);

export {
  IconMenu,
  IconX,
  IconArrowRight,
  IconGlobe,
  IconPlay,
  IconChat,
  IconLock,
  IconChevronDown,
  IconSelector,
};
export type { IconProps };
