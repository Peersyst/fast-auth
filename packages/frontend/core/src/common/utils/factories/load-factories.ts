import { isDomainError } from "../../../domain/error";
import { IFactory } from "@shared/utils";

/**
 * Loads the factories.
 * @param factories The factories to load.
 * @returns A function that can be called to cleanup the factories.
 */
export async function loadFactories(...factories: IFactory<{}>[]): Promise<() => void> {
    try {
        const cleanups = await Promise.all(factories.map((factory) => factory.load()));
        return () => {
            cleanups.map((cleanup) => cleanup());
        };
    } catch (e) {
        if (!isDomainError(e) || e.message !== "SESSION_EXPIRED") throw e;
        return () => undefined;
    }
}
