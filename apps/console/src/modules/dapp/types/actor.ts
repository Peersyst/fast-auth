import { ActorRole } from "@shared/modules/dapp";
import { SessionUser } from "../../auth/types/session-user";

export type Actor = { email: string | null; role: ActorRole };

export const SYSTEM: Actor = { email: null, role: ActorRole.SYSTEM };

/**
 * Builds the event actor for a dApp owner.
 * @param user The signed-in owner.
 * @returns The actor.
 */
export const ownerActor = (user: SessionUser): Actor => ({ email: user.email, role: ActorRole.USER });

/**
 * Builds the event actor for an admin.
 * @param admin The signed-in admin.
 * @returns The actor.
 */
export const adminActor = (admin: SessionUser): Actor => ({ email: admin.email, role: ActorRole.ADMIN });
