import { Link } from "react-router";
import { useTranslate } from "@frontend/locale/react";

export function NotFoundScreen(): React.JSX.Element {
    const translate = useTranslate();
    return (
        <section className="grid gap-4 [&_h1]:text-3xl">
            <h1>{translate("notFound.title")}</h1>
            <p>
                <Link to="/">{translate("notFound.home")}</Link>
            </p>
        </section>
    );
}
