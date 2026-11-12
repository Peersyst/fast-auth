import { IconProps, SvgIcon } from "../display/svg-icon";

export function CheckCircleIcon({ size = 16 }: IconProps): React.JSX.Element {
    return (
        <SvgIcon size={size}>
            <circle cx="12" cy="12" r="10" />
            <path d="m9 12 2 2 4-4" />
        </SvgIcon>
    );
}
