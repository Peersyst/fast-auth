import { IconProps, SvgIcon } from "../display/svg-icon";

export function ClockIcon({ size = 18 }: IconProps): React.JSX.Element {
    return (
        <SvgIcon size={size}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
        </SvgIcon>
    );
}
