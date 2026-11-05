import { IconProps, SvgIcon } from "../display/svg-icon";

export function BackIcon({ size = 14 }: IconProps): React.JSX.Element {
    return (
        <SvgIcon size={size}>
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
        </SvgIcon>
    );
}
