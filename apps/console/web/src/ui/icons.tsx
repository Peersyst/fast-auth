import type { ReactNode } from "react";

type IconProps = { size?: number };

function Icon({ size, strokeWidth = 2, children }: { size: number; strokeWidth?: number; children: ReactNode }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
        >
            {children}
        </svg>
    );
}

export const GridIcon = ({ size = 24 }: IconProps) => (
    <Icon size={size}>
        <rect width="7" height="7" x="3" y="3" rx="1" />
        <rect width="7" height="7" x="14" y="3" rx="1" />
        <rect width="7" height="7" x="14" y="14" rx="1" />
        <rect width="7" height="7" x="3" y="14" rx="1" />
    </Icon>
);

export const CopyIcon = ({ size = 14 }: IconProps) => (
    <Icon size={size}>
        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </Icon>
);

export const MailIcon = ({ size = 14 }: IconProps) => (
    <Icon size={size}>
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </Icon>
);

export const PlusIcon = ({ size = 14 }: IconProps) => (
    <Icon size={size}>
        <path d="M5 12h14" />
        <path d="M12 5v14" />
    </Icon>
);

export const InfoIcon = ({ size = 20 }: IconProps) => (
    <Icon size={size}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
    </Icon>
);

export const WarningIcon = ({ size = 20 }: IconProps) => (
    <Icon size={size}>
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
    </Icon>
);

export const ErrorIcon = ({ size = 20 }: IconProps) => (
    <Icon size={size}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
    </Icon>
);

export const TipIcon = ({ size = 20 }: IconProps) => (
    <Icon size={size}>
        <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
        <path d="M9 18h6" />
        <path d="M10 22h4" />
    </Icon>
);

export const CloseIcon = ({ size = 16 }: IconProps) => (
    <Icon size={size}>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
    </Icon>
);

export const CheckIcon = ({ size = 14 }: IconProps) => (
    <Icon size={size} strokeWidth={3}>
        <path d="M20 6 9 17l-5-5" />
    </Icon>
);

export const ClockIcon = ({ size = 18 }: IconProps) => (
    <Icon size={size}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
    </Icon>
);

export const KeyIcon = ({ size = 18 }: IconProps) => (
    <Icon size={size}>
        <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </Icon>
);

export const PencilIcon = ({ size = 14 }: IconProps) => (
    <Icon size={size}>
        <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
        <path d="m15 5 4 4" />
    </Icon>
);

export const BackIcon = ({ size = 14 }: IconProps) => (
    <Icon size={size}>
        <path d="m12 19-7-7 7-7" />
        <path d="M19 12H5" />
    </Icon>
);

export const CheckCircleIcon = ({ size = 16 }: IconProps) => (
    <Icon size={size}>
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-4" />
    </Icon>
);

export const XCircleIcon = ({ size = 16 }: IconProps) => (
    <Icon size={size}>
        <circle cx="12" cy="12" r="10" />
        <path d="m15 9-6 6" />
        <path d="m9 9 6 6" />
    </Icon>
);

export const TrashIcon = ({ size = 16 }: IconProps) => (
    <Icon size={size}>
        <path d="M3 6h18" />
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
    </Icon>
);

export const ZapIcon = ({ size = 16 }: IconProps) => (
    <Icon size={size}>
        <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
    </Icon>
);

export const UserPenIcon = ({ size = 16 }: IconProps) => (
    <Icon size={size}>
        <path d="M11.5 15H7a4 4 0 0 0-4 4v2" />
        <path d="M21.378 16.626a1 1 0 0 0-3.004-3.004l-4.01 4.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z" />
        <circle cx="10" cy="7" r="4" />
    </Icon>
);

export const ChevronRightIcon = ({ size = 16 }: IconProps) => (
    <Icon size={size}>
        <path d="m9 18 6-6-6-6" />
    </Icon>
);

export const SearchIcon = ({ size = 16 }: IconProps) => (
    <Icon size={size}>
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
    </Icon>
);

export const ServerIcon = ({ size = 16 }: IconProps) => (
    <Icon size={size}>
        <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
        <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
        <path d="M6 6h.01" />
        <path d="M6 18h.01" />
    </Icon>
);
