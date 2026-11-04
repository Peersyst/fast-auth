import { Link } from "react-router-dom";

export function NotFound() {
    return (
        <section className="grid gap-4 [&_h1]:text-2xl">
            <h1>Page not found</h1>
            <p>
                <Link to="/">Go to the console</Link>
            </p>
        </section>
    );
}
