#!/usr/bin/env node
/**
 * Build Auth0 forms by injecting per-component JS, CSS and schema into base templates.
 *
 * Layout:
 *   <form>/
 *     <form>_form_base.json     — template; CUSTOM components carry "$source": "<folder>"
 *     <source>/index.js         — injected into config.code (prepended with shared helpers)
 *     <source>/index.css        — injected into config.css
 *     <source>/schema.json      — optional; injected into config.schema (defaults to {})
 *     <form>_form.json          — generated, ready to upload via Auth0 "Import from JSON"
 *
 * "$source" resolution:
 *   - "details"        → <form>/details/        (per-form component)
 *   - "shared/image"   → shared/image/          (path with "/" resolves from forms root)
 *
 * Shared helpers (shared/helpers/index.js) are prepended verbatim to every component's
 * `config.code`. The helpers file declares `var __auth0FormHelpers = { ... }` as a top-level
 * variable, so components can call `__auth0FormHelpers.renderDetails(...)` directly. The
 * trailing `if (typeof module !== "undefined") { module.exports = ... }` block is a no-op
 * in the Auth0 runtime (no CommonJS) and is left in place for simplicity.
 *
 * Usage: node packages/auth0/src/forms/build.js
 */

const fs = require("fs");
const path = require("path");

const FORMS_DIR = __dirname;
const HELPERS_PATH = path.join(FORMS_DIR, "shared", "helpers", "index.js");

const FORMS = [
    { name: "transaction", base: "transaction_form_base.json", out: "transaction_form.json" },
    { name: "delegate_action", base: "delegate_action_form_base.json", out: "delegate_action_form.json" },
];

function readHelpersPreamble() {
    if (!fs.existsSync(HELPERS_PATH)) {
        throw new Error(`Helpers file not found: ${HELPERS_PATH}`);
    }
    const raw = fs.readFileSync(HELPERS_PATH, "utf8");
    return `// --- BEGIN __auth0FormHelpers (auto-inlined from shared/helpers/index.js) ---\n${raw}\n// --- END __auth0FormHelpers ---\n\n`;
}

/**
 * Auth0 evaluates a custom field's `config.code` as a single expression (effectively
 * `new Function("return " + code)`), expecting it to yield the field factory function.
 * The shared helpers are top-level statements (`const`, `var`, function declarations), so
 * prepending them verbatim would produce `return ...const...` → "Unexpected token 'const'".
 * Wrapping everything in an IIFE keeps the helpers in scope and makes the whole payload a
 * single expression that returns the component factory.
 */
function wrapComponentCode(helpersPreamble, componentCode) {
    return `(function () {\n${helpersPreamble}\nreturn (\n${componentCode}\n);\n})()\n`;
}

function resolveComponentDir(formDir, source) {
    return source.includes("/") ? path.join(FORMS_DIR, source) : path.join(formDir, source);
}

function readComponent(formDir, source, helpersPreamble) {
    const componentDir = resolveComponentDir(formDir, source);
    if (!fs.existsSync(componentDir)) {
        throw new Error(`Component folder not found: ${componentDir}`);
    }

    const codePath = path.join(componentDir, "index.js");
    const cssPath = path.join(componentDir, "index.css");
    const schemaPath = path.join(componentDir, "schema.json");

    const componentCode = fs.existsSync(codePath) ? fs.readFileSync(codePath, "utf8") : "";
    const code = componentCode ? wrapComponentCode(helpersPreamble, componentCode) : "";
    const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, "utf8") : "";
    const schema = fs.existsSync(schemaPath) ? JSON.parse(fs.readFileSync(schemaPath, "utf8") || "{}") : {};

    return { code, css, schema };
}

function injectComponents(template, formDir, helpersPreamble) {
    const nodes = template.form && template.form.nodes ? template.form.nodes : [];
    for (const node of nodes) {
        const components = node.config && node.config.components ? node.config.components : [];
        for (const component of components) {
            if (!component.$source) continue;
            const { code, css, schema } = readComponent(formDir, component.$source, helpersPreamble);
            component.config = component.config || {};
            component.config.code = code;
            component.config.css = css;
            component.config.schema = schema;
            delete component.$source;
        }
    }
    return template;
}

function buildForm({ name, base, out }, helpersPreamble) {
    const formDir = path.join(FORMS_DIR, name);
    const basePath = path.join(formDir, base);
    const outPath = path.join(formDir, out);

    const template = JSON.parse(fs.readFileSync(basePath, "utf8"));
    const built = injectComponents(template, formDir, helpersPreamble);

    fs.writeFileSync(outPath, JSON.stringify(built, null, 2) + "\n");
    console.log(`✓ ${path.relative(process.cwd(), outPath)}`);
}

function main() {
    const helpersPreamble = readHelpersPreamble();
    for (const form of FORMS) {
        buildForm(form, helpersPreamble);
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    readHelpersPreamble,
    wrapComponentCode,
    resolveComponentDir,
    readComponent,
    injectComponents,
    buildForm,
    FORMS,
    FORMS_DIR,
    HELPERS_PATH,
};
