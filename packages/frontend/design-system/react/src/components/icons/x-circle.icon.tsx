import { IconProps, SvgIcon } from "../display/svg-icon";

export function XCircleIcon({ size = 16 }: IconProps): React.JSX.Element {
    return (
        <SvgIcon size={size}>
            <circle cx="12" cy="12" r="10" />
            <path d="m15 9-6 6" />
            <path d="m9 9 6 6" />
        </SvgIcon>
    );
}
