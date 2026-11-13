import { IFactory } from "@shared/utils";

/**
 * Initializes the factories.
 * @param factories The factories to initialize.
 */
export async function initFactories(...factories: IFactory<{}>[]): Promise<void> {
    await Promise.all(factories.map((factory) => factory.init()));
}
