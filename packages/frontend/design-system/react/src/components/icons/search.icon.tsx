import { IconProps, SvgIcon } from "../display/svg-icon";

export function SearchIcon({ size = 16 }: IconProps): React.JSX.Element {
    return (
        <SvgIcon size={size}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
        </SvgIcon>
    );
}
