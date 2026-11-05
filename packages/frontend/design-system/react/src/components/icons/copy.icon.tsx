import { IconProps, SvgIcon } from "../display/svg-icon";

export function CopyIcon({ size = 14 }: IconProps): React.JSX.Element {
    return (
        <SvgIcon size={size}>
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </SvgIcon>
    );
}
