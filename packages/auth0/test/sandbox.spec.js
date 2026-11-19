/**
 * @jest-environment jsdom
 *
 * The sandbox notice: the forms' notice component, and the login page template that has to
 * carry the same text as the action.
 */
const fs = require("fs");
const path = require("path");
const buildModule = require("../src/forms/build.js");
const { SANDBOX_NOTICE } = require("../src/actions/authorize-app.action.js");

const TEMPLATE_PATH = path.join(__dirname, "..", "src", "universal-login", "sandbox.liquid");

function renderNotice(params) {
    const { code } = buildModule.readComponent(buildModule.FORMS_DIR, "shared/notice", buildModule.readHelpersPreamble());
    const factory = new Function(`return ${code}`)();
    return factory({ custom: { getParams: () => params } }).init();
}

describe("notice form component", () => {
    test("renders the notice as text, never as HTML", () => {
        const notice = renderNotice({ text: "<img src=x onerror=alert(1)> careful" });

        expect(notice.textContent).toBe("<img src=x onerror=alert(1)> careful");
        expect(notice.querySelector("img")).toBeNull();
        expect(notice.getAttribute("role")).toBe("note");
        expect(notice.classList.contains("environment-notice")).toBe(true);
    });

    test.each([[""], ["   "], [undefined]])("renders nothing for the notice %j", (text) => {
        const notice = renderNotice({ text });

        expect(notice.textContent).toBe("");
        expect(notice.classList.contains("environment-notice")).toBe(false);
    });
});

describe("sandbox login page template", () => {
    const template = fs.readFileSync(TEMPLATE_PATH, "utf8");

    test("carries the action's sandbox notice word for word", () => {
        expect(template).toContain(SANDBOX_NOTICE);
    });

    test("keeps the tags Auth0 requires of a page template", () => {
        expect(template).toContain("{%- auth0:head -%}");
        expect(template).toContain("{%- auth0:widget -%}");
    });
});
