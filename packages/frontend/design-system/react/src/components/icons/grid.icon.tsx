import { IconProps, SvgIcon } from "../display/svg-icon";

export function GridIcon({ size = 24 }: IconProps): React.JSX.Element {
    return (
        <SvgIcon size={size}>
            <rect width="7" height="7" x="3" y="3" rx="1" />
            <rect width="7" height="7" x="14" y="3" rx="1" />
            <rect width="7" height="7" x="14" y="14" rx="1" />
            <rect width="7" height="7" x="3" y="14" rx="1" />
        </SvgIcon>
    );
}
