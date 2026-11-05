import "@testing-library/jest-dom";

// Set up data access
import "../src/core/data-access/setup";

// Set up domain
import "../src/core/domain/setup";

import { focusManager } from "@tanstack/react-query";
import { i18nextInitializationPromise } from "../src/locale";

jest.mock("../src/config", () => {
    const { ConfigManagerMock } = jest.requireActual("@frontend/config/mocks/core/manager");
    const { getAttribute } = jest.requireActual("@shared/utils");
    const config = jest.requireActual("../src/config/static").default;

    const configManager = new ConfigManagerMock();
    configManager.config = config;
    configManager.getAll.mockReturnValue(config);
    configManager.get.mockImplementation((key: string) => getAttribute(config, key));

    return { configManager };
});

beforeAll(() => i18nextInitializationPromise);

afterEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
    focusManager.setFocused(undefined);
});

// jsdom has <dialog> but not its modal API. Like a browser, showModal opens it and focuses its first focusable descendant.
HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
    for (const element of this.querySelectorAll<HTMLElement>("*")) {
        element.focus();
        if (document.activeElement === element) return;
    }
};
HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
};
