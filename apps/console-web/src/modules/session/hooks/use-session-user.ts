import { useOutletContext } from "react-router";
import { MeDto } from "@shared/console";

/**
 * Gets the signed-in user `SessionGate` loaded, without another observer of the `me` query refetching it on mount.
 * @returns The user, verified and with the role the route needs.
 */
export function useSessionUser(): MeDto {
    return useOutletContext<MeDto>();
}
