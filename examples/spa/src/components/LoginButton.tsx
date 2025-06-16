import { useFastAuth } from "../hooks/use-fast-auth-relayer";

export default function LoginButton() {
    const { client } = useFastAuth();

    return <button onClick={() => client?.login()}>Log in</button>;
}
