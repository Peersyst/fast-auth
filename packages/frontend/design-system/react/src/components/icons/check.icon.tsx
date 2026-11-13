import { IconProps, SvgIcon } from "../display/svg-icon";

export function CheckIcon({ size = 14 }: IconProps): React.JSX.Element {
    return (
        <SvgIcon size={size} strokeWidth={3}>
            <path d="M20 6 9 17l-5-5" />
        </SvgIcon>
    );
}
