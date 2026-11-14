import type { SVGProps } from 'react';
import type { FactKind } from './format';

/** One line-icon family for the demo portal: 24px box, 1.8px round strokes, currentColor. */
function Svg(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    />
  );
}

export const SearchIcon = () => (
  <Svg>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </Svg>
);

export const HeartIcon = () => (
  <Svg>
    <path d="M12 20.2s-7.7-4.7-7.7-10.3A4.5 4.5 0 0 1 12 7.1a4.5 4.5 0 0 1 7.7 2.8c0 5.6-7.7 10.3-7.7 10.3z" />
  </Svg>
);

export const ChatIcon = () => (
  <Svg>
    <path d="M4.5 5.5h15v10.5h-8.2L7 19.5V16H4.5z" />
    <path d="M8.5 10.7h7" />
  </Svg>
);

export const UserIcon = () => (
  <Svg>
    <circle cx="12" cy="8.5" r="3.6" />
    <path d="M5 19.8c1.2-3.3 3.8-5 7-5s5.8 1.7 7 5" />
  </Svg>
);

export const PlusIcon = () => (
  <Svg>
    <path d="M12 5.5v13M5.5 12h13" />
  </Svg>
);

export const PinIcon = () => (
  <Svg>
    <path d="M12 21s-6.5-5.7-6.5-11a6.5 6.5 0 0 1 13 0c0 5.3-6.5 11-6.5 11z" />
    <circle cx="12" cy="10" r="2.3" />
  </Svg>
);

export const DoorIcon = () => (
  <Svg>
    <path d="M6.5 20.5V4.5h11v16M4 20.5h16" />
    <path d="M14.3 12.5h.01" strokeWidth="2.6" />
  </Svg>
);

export const AreaIcon = () => (
  <Svg>
    <rect x="4" y="4" width="16" height="16" rx="1.5" />
    <path d="M4 9h3M4 14h3M9 4v3M14 4v3" />
  </Svg>
);

export const StairsIcon = () => (
  <Svg>
    <path d="M4 20h4.5v-4.5H13V11h4.5V6.5H20" />
  </Svg>
);

export const CameraIcon = () => (
  <Svg>
    <path d="M4 8.5h3.2L8.8 6h6.4l1.6 2.5H20v10H4z" />
    <circle cx="12" cy="13.2" r="3.1" />
  </Svg>
);

export const PhoneIcon = () => (
  <Svg>
    <path d="M6.6 4.5h2.6l1.4 4-2 1.3a10 10 0 0 0 5.6 5.6l1.3-2 4 1.4v2.6a1.8 1.8 0 0 1-2 1.8A15.5 15.5 0 0 1 4.8 6.5a1.8 1.8 0 0 1 1.8-2z" />
  </Svg>
);

export const ShareIcon = () => (
  <Svg>
    <circle cx="6.5" cy="12" r="2.2" />
    <circle cx="17" cy="6.5" r="2.2" />
    <circle cx="17" cy="17.5" r="2.2" />
    <path d="M8.5 11l6.5-3.4M8.5 13l6.5 3.4" />
  </Svg>
);

export const CheckIcon = () => (
  <Svg>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);

export const AlertIcon = () => (
  <Svg>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.8v5.2M12 16.2h.01" />
  </Svg>
);

export const ClockIcon = () => (
  <Svg>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
);

export const ChevronIcon = () => (
  <Svg>
    <path d="M9.5 6l6 6-6 6" />
  </Svg>
);

const FACT_ICON: Record<FactKind, () => React.JSX.Element> = { rooms: DoorIcon, area: AreaIcon, floor: StairsIcon };

export function FactIcon({ kind }: { kind: FactKind }) {
  const Icon = FACT_ICON[kind];
  return <Icon />;
}

/** The portal's mark: a rose tile for Timișoara, the city of roses, with a white house. */
export const LogoMark = () => (
  <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true" focusable="false">
    <rect width="34" height="34" rx="9" fill="currentColor" />
    <path d="M9.5 16.5L17 10l7.5 6.5V25h-5.2v-5.2h-4.6V25H9.5z" fill="#fff" />
  </svg>
);
