import type { ReactNode } from "react";

export interface IconProps {
  size?: number;
  /** Accessible name. When absent the icon is aria-hidden (decorative). */
  label?: string;
  className?: string;
}

function Svg({ size = 24, label, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {children}
    </svg>
  );
}

export const IconSearch = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Svg>
);

export const IconClear = (props: IconProps) => (
  <Svg {...props}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </Svg>
);

export const IconCart = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="9" cy="20" r="1.6" />
    <circle cx="17" cy="20" r="1.6" />
    <path d="M3 4h2l2.5 11.2a1.5 1.5 0 0 0 1.5 1.2h7.3a1.5 1.5 0 0 0 1.4-1.1L20 8H6" />
  </Svg>
);

export const IconHome = (props: IconProps) => (
  <Svg {...props}>
    <path d="m3 10.5 9-7.5 9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
    <path d="M10 21v-6h4v6" />
  </Svg>
);

export const IconSell = (props: IconProps) => (
  <Svg {...props}>
    <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
    <circle cx="7.5" cy="7.5" r="1" />
  </Svg>
);

export const IconSales = (props: IconProps) => (
  <Svg {...props}>
    <path d="M5 3h14a1 1 0 0 1 1 1v17l-2.5-1.5L15 21l-2.5-1.5L10 21l-2.5-1.5L5 21Z" />
    <path d="M9 8h6" />
    <path d="M9 12h6" />
  </Svg>
);

export const IconMore = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconProducts = (props: IconProps) => (
  <Svg {...props}>
    <path d="M21 8.3v7.4a2 2 0 0 1-1 1.7l-7 4a2 2 0 0 1-2 0l-7-4a2 2 0 0 1-1-1.7V8.3a2 2 0 0 1 1-1.7l7-4a2 2 0 0 1 2 0l7 4a2 2 0 0 1 1 1.7Z" />
    <path d="M3.3 7.5 12 12.5l8.7-5" />
    <path d="M12 22V12.5" />
  </Svg>
);

export const IconSettings = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.08a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.08a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1.03Z" />
  </Svg>
);

export const IconExpenses = (props: IconProps) => (
  <Svg {...props}>
    <ellipse cx="9" cy="5" rx="6" ry="2.5" />
    <path d="M3 5v7c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V5" />
    <path d="M15 8.75v7c0 1.4-2.7 2.5-6 2.5s-6-1.1-6-2.5" />
  </Svg>
);

export const IconDashboard = (props: IconProps) => (
  <Svg {...props}>
    <path d="M5 20v-7" />
    <path d="M11 20V6" />
    <path d="M17 20v-11" />
    <path d="M3 20h18" />
  </Svg>
);

export const IconPlus = (props: IconProps) => (
  <Svg {...props}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </Svg>
);

export const IconMinus = (props: IconProps) => (
  <Svg {...props}>
    <path d="M5 12h14" />
  </Svg>
);

export const IconTrash = (props: IconProps) => (
  <Svg {...props}>
    <path d="M4 7h16" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="m6 7 1 13a1.5 1.5 0 0 0 1.5 1.3h7A1.5 1.5 0 0 0 17 20l1-13" />
    <path d="M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2" />
  </Svg>
);

export const IconChevronDown = (props: IconProps) => (
  <Svg {...props}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);

export const IconBack = (props: IconProps) => (
  <Svg {...props}>
    <path d="M19 12H5" />
    <path d="m11 18-6-6 6-6" />
  </Svg>
);

export const IconCheck = (props: IconProps) => (
  <Svg {...props}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </Svg>
);

export const IconWarning = (props: IconProps) => (
  <Svg {...props}>
    <path d="M12 3.8 2.9 19.5a1 1 0 0 0 .9 1.5h16.4a1 1 0 0 0 .9-1.5Z" />
    <path d="M12 9.5V14" />
    <path d="M12 17.2h.01" />
  </Svg>
);

export const IconClose = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="m9 9 6 6" />
    <path d="m15 9-6 6" />
  </Svg>
);

export const IconUpload = (props: IconProps) => (
  <Svg {...props}>
    <path d="M12 16V4" />
    <path d="m6 10 6-6 6 6" />
    <path d="M4 20h16" />
  </Svg>
);

export const IconDownload = (props: IconProps) => (
  <Svg {...props}>
    <path d="M12 4v12" />
    <path d="m6 10 6 6 6-6" />
    <path d="M4 20h16" />
  </Svg>
);

export const IconQr = (props: IconProps) => (
  <Svg {...props}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <path d="M14 14h3" />
    <path d="M21 14v3" />
    <path d="M18 21h3" />
  </Svg>
);

export const IconCard = (props: IconProps) => (
  <Svg {...props}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 10h18" />
    <path d="M7 15h4" />
  </Svg>
);

export const IconCash = (props: IconProps) => (
  <Svg {...props}>
    <rect x="2.5" y="6" width="19" height="12" rx="2" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M6 12h.01" />
    <path d="M18 12h.01" />
  </Svg>
);
