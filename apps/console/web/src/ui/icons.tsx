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
