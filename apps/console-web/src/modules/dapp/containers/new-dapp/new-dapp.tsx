import { useState } from "react";
import { useSessionUser } from "../../../session/hooks/use-session-user";
import { NoDapp } from "../../components/no-dapp/no-dapp";
import { RegisterDapp } from "../register-dapp/register-dapp";

type NewDappView = "card" | "form" | "cardAgain";

export type NewDappProps = {
    /**
     * Whether to move focus to the card's heading, as the dApp it replaces went away.
     */
    focusHeading: boolean;
};

export function NewDapp({ focusHeading }: NewDappProps): React.JSX.Element {
    const { email } = useSessionUser();
    const [view, setView] = useState<NewDappView>("card");
    if (view === "form") return <RegisterDapp onCancel={() => setView("cardAgain")} />;
    return (
        <NoDapp
            email={email}
            focus={view === "cardAgain" ? "register" : focusHeading ? "heading" : undefined}
            onRegister={() => setView("form")}
        />
    );
}
