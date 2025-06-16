import { useFastAuthRelayer } from "../hooks/use-fast-auth-relayer";

export default function CreateAccount({ publicKey }: { publicKey: string }) {
    const { relayer } = useFastAuthRelayer();

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!relayer) {
            throw new Error("Relayer not initialized");
        }
        const formData = new FormData(e.target as HTMLFormElement);
        console.log(formData);
        const accountId = formData.get("accountid") as string;
        if (!accountId) {
            throw new Error("Account ID is required");
        }
        console.log("Creating account", accountId, publicKey);
        relayer.createAccount(accountId, publicKey);
    };
    return (
        <div>
            <form onSubmit={handleSubmit}>
                <input type="text" placeholder="Enter account ID" name="accountid" />
                <button type="submit">Create Account</button>
            </form>
        </div>
    );
}
