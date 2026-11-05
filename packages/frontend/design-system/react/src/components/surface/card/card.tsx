import { cn } from "../../../utils";
import { cardClasses, cardHeaderVariants } from "./card.styles";
import { CardBodyProps, CardHeaderProps, CardProps } from "./card.types";

export function Card({ as: Root = "section", className, ...rest }: CardProps): React.JSX.Element {
    return <Root {...rest} className={cn(cardClasses.root, className)} />;
}

export function CardHeader({ variant, className, ...rest }: CardHeaderProps): React.JSX.Element {
    return <div {...rest} className={cn(cardHeaderVariants({ variant }), className)} />;
}

export function CardBody({ as: Root = "div", className, ...rest }: CardBodyProps): React.JSX.Element {
    return <Root {...rest} className={cn(cardClasses.body, className)} />;
}
