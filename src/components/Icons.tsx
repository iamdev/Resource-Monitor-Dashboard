import React from "react";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

export const CpuIcon: React.FC<IconProps> = ({ size = 20, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <rect x="9" y="9" width="6" height="6" />
    <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3" />
  </svg>
);

export const RamIcon: React.FC<IconProps> = ({ size = 20, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M2 5h20v6H2z" />
    <path d="M5 11v3M9 11v3M13 11v3M17 11v3M21 11v3" />
    <rect x="4" y="7" width="2" height="2" rx="0.5" />
    <rect x="8" y="7" width="2" height="2" rx="0.5" />
    <rect x="12" y="7" width="2" height="2" rx="0.5" />
    <rect x="16" y="7" width="2" height="2" rx="0.5" />
  </svg>
);

export const GpuIcon: React.FC<IconProps> = ({ size = 20, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {/* Graphics card shroud */}
    <rect x="2" y="6" width="20" height="12" rx="2" />
    {/* Left Fan */}
    <circle cx="8" cy="12" r="3" />
    <path d="M8 9v6M6.5 10.5l3 3M9.5 10.5l-3 3" />
    {/* Right Fan */}
    <circle cx="16" cy="12" r="3" />
    <path d="M16 9v6M14.5 10.5l3 3M17.5 10.5l-3 3" />
    {/* PCIe Connection pin layout */}
    <path d="M6 18v2h4v-2M14 18v2h4v-2" />
  </svg>
);

export const NetworkLanIcon: React.FC<IconProps> = ({ size = 20, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {/* RJ45 Port shape */}
    <rect x="4" y="6" width="16" height="12" rx="2" />
    {/* Connector clip slot */}
    <path d="M9 18v-3h6v3" />
    {/* Connection pin indicators */}
    <path d="M8 9h1M11 9h1M14 9h1M17 9h1" />
  </svg>
);

export const NetworkWifiIcon: React.FC<IconProps> = ({ size = 20, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 20h.01M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 14 0M1.5 9.5a15 15 0 0 1 21 0" />
  </svg>
);

export const NetworkOfflineIcon: React.FC<IconProps> = ({ size = 20, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M1 1l22 22" />
    <path d="M16.72 11.06A10.94 10.94 0 0 1 19 13M5 13a10.94 10.94 0 0 1 5.83-2.84" />
    <path d="M12 20h.01" />
    <path d="M8.5 16.5a5 5 0 0 1 3.25-1.43M15.5 16.5a5 5 0 0 1 .5.5" />
  </svg>
);

export const DiskIcon: React.FC<IconProps> = ({ size = 20, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {/* Disk cylinder stack */}
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v6c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    <path d="M3 11v6c0 1.66 4 3 9 3s9-1.34 9-3v-6" />
  </svg>
);
