import { useAuth0 } from "@auth0/auth0-react";

export function useSignOut(): () => void {
    const { logout } = useAuth0();
    return () => void logout({ logoutParams: { returnTo: window.location.origin } });
}
