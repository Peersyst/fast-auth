import { useEffect } from "react";
import { StateManager } from "@frontend/core/domain/state/manager";
import { initFactories, loadFactories } from "@frontend/core/common/utils/factories";
import { configManager } from "../../../config";
import { i18nextInitializationPromise } from "../../../locale";
import { ServiceFactory } from "../../../core/data-access/factories/service.factory";
import { RepositoryFactory } from "../../../core/data-access/factories/repository.factory";
import { ControllerFactory } from "../../../core/domain/factories/controller.factory";
import { useAppState } from "../state/app.state";

export interface UseInitResult {
    isLoading: boolean;
    isError: boolean;
    isSuccess: boolean;
}

/**
 * Initializes the app once, however many times the hook mounts: the Auth0 client must be built and a redirect
 * sign-in finished exactly once.
 */
let initialization: Promise<void> | undefined;

/**
 * Waits for the config and the states, runs the factories' `onInit` and `onLoad` and the locale.
 */
async function init(): Promise<void> {
    await Promise.all([configManager.initialization, StateManager.initialization]);
    await initFactories(ServiceFactory, RepositoryFactory, ControllerFactory);
    await loadFactories(ServiceFactory, RepositoryFactory, ControllerFactory);
    await i18nextInitializationPromise;
}

/**
 * Hook used to initialize the app.
 * It waits for the config, the states, the factories and the locale, then sets the app state to success.
 * @returns The result of the initialization.
 */
export function useInit(): UseInitResult {
    const { isLoading, isError, isSuccess, setIsSuccess, setIsError } = useAppState();

    useEffect(() => {
        initialization ??= init();
        initialization.then(setIsSuccess, setIsError);
    }, []);

    return { isLoading, isError, isSuccess };
}
