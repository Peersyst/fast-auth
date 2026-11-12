import { IconProps, SvgIcon } from "../display/svg-icon";

export function ChevronRightIcon({ size = 16 }: IconProps): React.JSX.Element {
    return (
        <SvgIcon size={size}>
            <path d="m9 18 6-6-6-6" />
        </SvgIcon>
    );
}
