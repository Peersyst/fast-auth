import { IconProps, SvgIcon } from "../display/svg-icon";

export function MoonIcon({ size = 16 }: IconProps): React.JSX.Element {
    return (
        <SvgIcon size={size}>
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </SvgIcon>
    );
}
