/**
 * @jest-environment jsdom
 */
const path = require("path");
const buildModule = require("../src/forms/build.js");

function renderDetailsAsAuth0(params) {
    const { code } = buildModule.readComponent(path.join(buildModule.FORMS_DIR, "nep413"), "details", buildModule.readHelpersPreamble());
    const factory = new Function(`return ${code}`)();
    return factory({ custom: { getParams: () => params } }).init();
}

describe("NEP-413 form details component", () => {
    test("renders the message as text, never as HTML", () => {
        const box = renderDetailsAsAuth0({ message: "<img src=x onerror=alert(1)>\nline two", recipient: "example.near", callbackUrl: "" });

        expect(box.querySelector(".message-body").textContent).toBe("<img src=x onerror=alert(1)>\nline two");
        expect(box.querySelector("img")).toBeNull();
        expect(box.textContent).toContain("example.near");
        expect(box.textContent).not.toContain("Callback URL");
    });

    test("keeps the message's whitespace and never caps or clips its height", () => {
        const { css } = buildModule.readComponent(path.join(buildModule.FORMS_DIR, "nep413"), "details", buildModule.readHelpersPreamble());
        const messageBody = css.match(/\.message-body\s*\{([^}]*)\}/)[1];

        expect(messageBody).toContain("white-space: pre-wrap");
        expect(css).not.toMatch(/(?<![-\w])(max-)?(height|block-size)\s*:|overflow(-[xy])?\s*:\s*(hidden|clip)|line-clamp/);
    });

    test("shows the callback url when the payload has one", () => {
        const box = renderDetailsAsAuth0({ message: "hi", recipient: "example.near", callbackUrl: "https://example.com/cb" });

        expect(box.textContent).toContain("Recipient");
        expect(box.textContent).toContain("Callback URL");
        expect(box.textContent).toContain("https://example.com/cb");
    });
});
