import { IconProps, SvgIcon } from "../display/svg-icon";

export function ServerIcon({ size = 16 }: IconProps): React.JSX.Element {
    return (
        <SvgIcon size={size}>
            <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
            <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
            <path d="M6 6h.01" />
            <path d="M6 18h.01" />
        </SvgIcon>
    );
}
