import type { SVGProps } from 'react';

/** One stroke family for the phone pages: 20px box, 2px round strokes, currentColor. */
function Svg(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    />
  );
}

export const CheckIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="M4.5 10.5l3.5 3.5 7.5-8" />
  </Svg>
);

export const CrossIcon = () => (
  <Svg>
    <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />
  </Svg>
);

export const PendingIcon = () => (
  <Svg>
    <circle cx="10" cy="10" r="6.5" strokeDasharray="3 3.2" />
  </Svg>
);

export const CopyIcon = () => (
  <Svg>
    <rect x="7" y="7" width="9.5" height="9.5" rx="1.5" />
    <path d="M13 4.5v-.1A1.4 1.4 0 0011.6 3H4.4A1.4 1.4 0 003 4.4v7.2A1.4 1.4 0 004.4 13h.1" />
  </Svg>
);

export const ClockIcon = () => (
  <Svg>
    <circle cx="10" cy="10" r="7" />
    <path d="M10 6v4l2.5 2" />
  </Svg>
);

export const ArrowIcon = () => (
  <Svg>
    <path d="M4 10h11.5M11 5.5l4.5 4.5-4.5 4.5" />
  </Svg>
);
