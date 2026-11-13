import { IconProps, SvgIcon } from "../display/svg-icon";

export function MailIcon({ size = 14 }: IconProps): React.JSX.Element {
    return (
        <SvgIcon size={size}>
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </SvgIcon>
    );
}
