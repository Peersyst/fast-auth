import { PropsWithChildren } from "react";
import { Card } from "@frontend/design-system-react/card";

export const sessionCardClassNames = {
    actions: "flex flex-wrap gap-3",
    support: "text-sm text-ink-subtle",
};

export function SessionCard({ children }: PropsWithChildren): React.JSX.Element {
    return <Card className="mx-auto mt-6 mb-0 grid max-w-[480px] gap-4 p-8 [&_h1]:text-2xl">{children}</Card>;
}
