/**
 * @jest-environment node
 *
 * Tests for the form build pipeline: helpers are inlined, $source markers resolved,
 * and the resulting JSON is shaped the way Auth0's "Import from JSON" expects.
 */
const fs = require("fs");
const path = require("path");
const os = require("os");

const buildModule = require("../src/forms/build.js");

describe("readHelpersPreamble", () => {
    test("contains the __auth0FormHelpers declaration", () => {
        const preamble = buildModule.readHelpersPreamble();
        expect(preamble).toContain("__auth0FormHelpers");
        expect(preamble).toContain("renderDetails");
        expect(preamble).toContain("base58Encode");
    });
});

describe("buildForm — transaction form", () => {
    const TX_FORM_PATH = path.join(buildModule.FORMS_DIR, "transaction", "transaction_form.json");

    beforeAll(() => {
        // Clean previous output, then run the real build pipeline against the real layout.
        if (fs.existsSync(TX_FORM_PATH)) fs.unlinkSync(TX_FORM_PATH);
        buildModule.buildForm(buildModule.FORMS[0], buildModule.readHelpersPreamble());
    });

    test("produces a valid JSON file", () => {
        expect(fs.existsSync(TX_FORM_PATH)).toBe(true);
        const raw = fs.readFileSync(TX_FORM_PATH, "utf8");
        expect(() => JSON.parse(raw)).not.toThrow();
    });

    test("no component still carries a $source marker", () => {
        const form = JSON.parse(fs.readFileSync(TX_FORM_PATH, "utf8"));
        const components = form.form.nodes.flatMap((n) => n.config.components || []);
        for (const c of components) {
            expect(c.$source).toBeUndefined();
        }
    });

    test("every CUSTOM component has helpers preamble + component code", () => {
        const form = JSON.parse(fs.readFileSync(TX_FORM_PATH, "utf8"));
        const customs = form.form.nodes.flatMap((n) => n.config.components || []).filter((c) => c.type === "CUSTOM");
        expect(customs.length).toBeGreaterThan(0);
        for (const c of customs) {
            expect(c.config.code).toContain("__auth0FormHelpers");
            expect(c.config.code).toContain("renderDetails");
        }
    });

    test("details component code references signerId (transaction field shape)", () => {
        const form = JSON.parse(fs.readFileSync(TX_FORM_PATH, "utf8"));
        const components = form.form.nodes.flatMap((n) => n.config.components || []);
        // The details component is the one whose params reference {{ fields.signerId }}.
        const details = components.find((c) => c.config && c.config.params && c.config.params.signerId);
        expect(details).toBeDefined();
        expect(details.config.code).toContain("Signer ID");
    });
});

describe("buildForm — delegate_action form", () => {
    const DA_FORM_PATH = path.join(buildModule.FORMS_DIR, "delegate_action", "delegate_action_form.json");

    beforeAll(() => {
        if (fs.existsSync(DA_FORM_PATH)) fs.unlinkSync(DA_FORM_PATH);
        buildModule.buildForm(buildModule.FORMS[1], buildModule.readHelpersPreamble());
    });

    test("details component code references senderId and Max Block Height", () => {
        const form = JSON.parse(fs.readFileSync(DA_FORM_PATH, "utf8"));
        const components = form.form.nodes.flatMap((n) => n.config.components || []);
        const details = components.find((c) => c.config && c.config.params && c.config.params.senderId);
        expect(details).toBeDefined();
        expect(details.config.code).toContain("Sender ID");
        expect(details.config.code).toContain("Max Block Height");
    });
});

describe("readComponent (isolated)", () => {
    test("returns empty code/css/schema for a component folder with only schema.json", () => {
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "auth0-build-"));
        const componentDir = path.join(tmp, "x");
        fs.mkdirSync(componentDir);
        fs.writeFileSync(path.join(componentDir, "schema.json"), JSON.stringify({ foo: "bar" }));
        const result = buildModule.readComponent(tmp, "x", "/* preamble */ ");
        expect(result.code).toBe("");
        expect(result.css).toBe("");
        expect(result.schema).toEqual({ foo: "bar" });
        fs.rmSync(tmp, { recursive: true, force: true });
    });

    test("wraps helpers preamble + component code in a single IIFE expression", () => {
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "auth0-build-"));
        const componentDir = path.join(tmp, "y");
        fs.mkdirSync(componentDir);
        fs.writeFileSync(path.join(componentDir, "index.js"), "function Comp(context) { return {}; }");
        const result = buildModule.readComponent(tmp, "y", "/*HELPERS*/\n");
        // Must be a single expression that yields the factory: `(function () { ...; return (Comp); })()`
        expect(result.code.startsWith("(function ()")).toBe(true);
        expect(result.code).toContain("/*HELPERS*/");
        expect(result.code).toContain("function Comp(context)");
        expect(result.code).toContain("return (");
        // The wrapped payload must itself be a valid expression (no "Unexpected token" when wrapped
        // the way Auth0 does: `new Function("return " + code)`).
        expect(() => new Function(`return ${result.code}`)).not.toThrow();
    });

    test("wrapComponentCode yields a factory-returning expression that runs", () => {
        const code = buildModule.wrapComponentCode(
            "var __auth0FormHelpers = { tag: 'helpers' };\n",
            "function Comp(context) { return { helpers: __auth0FormHelpers }; }",
        );
        const factory = new Function(`return ${code}`)();
        expect(typeof factory).toBe("function");
        expect(factory().helpers.tag).toBe("helpers");
    });
});
