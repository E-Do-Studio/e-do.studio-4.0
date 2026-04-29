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

export { IconMenu, IconX, IconArrowRight, IconGlobe, IconPlay };
export type { IconProps };
