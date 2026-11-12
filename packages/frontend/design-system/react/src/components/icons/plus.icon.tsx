import { IconProps, SvgIcon } from "../display/svg-icon";

export function PlusIcon({ size = 14 }: IconProps): React.JSX.Element {
    return (
        <SvgIcon size={size}>
            <path d="M5 12h14" />
            <path d="M12 5v14" />
        </SvgIcon>
    );
}
