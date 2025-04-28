import { useAuth0 } from "@auth0/auth0-react";

export default function LoginButton() {
    const { loginWithRedirect } = useAuth0();

    return (
        <button
            onClick={() =>
                loginWithRedirect({
                    authorizationParams: {
                        imageUrl:
                            "https://media.licdn.com/dms/image/v2/D4D0BAQH5KL-Ge_0iug/company-logo_200_200/company-logo_200_200/0/1696280807541/peersyst_technology_logo?e=2147483647&v=beta&t=uFYvQ5g6HDoIprYhNNV_zC7tzlBkvmPRkWzuLuDpHtc",
                        name: "Peersyst Technology",
                        permissions: JSON.stringify({
                            permission_type: "near",
                            resource: "demo-fa-v4.testnet",
                            actions: ["sign"],
                        }),
                    },
                })
            }
        >
            Log in
        </button>
    );
}
