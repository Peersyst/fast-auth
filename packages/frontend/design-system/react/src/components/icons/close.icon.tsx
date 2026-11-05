import { IconProps, SvgIcon } from "../display/svg-icon";

export function CloseIcon({ size = 16 }: IconProps): React.JSX.Element {
    return (
        <SvgIcon size={size}>
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </SvgIcon>
    );
}
