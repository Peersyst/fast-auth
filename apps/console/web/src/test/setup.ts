import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.unstubAllGlobals();
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
