import { IconProps, SvgIcon } from "../display/svg-icon";

export function ErrorIcon({ size = 20 }: IconProps): React.JSX.Element {
    return (
        <SvgIcon size={size}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
        </SvgIcon>
    );
}
