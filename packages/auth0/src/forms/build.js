#!/usr/bin/env node
/**
 * Build Auth0 forms by injecting per-component JS, CSS and schema into base templates.
 *
 * Layout:
 *   <form>/
 *     <form>_form_base.json     — template; CUSTOM components carry "$source": "<folder>"
 *     <source>/index.js         — injected into config.code
 *     <source>/index.css        — injected into config.css
 *     <source>/schema.json      — optional; injected into config.schema (defaults to {})
 *     <form>_form.json          — generated, ready to upload via Auth0 "Import from JSON"
 *
 * "$source" resolution:
 *   - "details"        → <form>/details/        (per-form component)
 *   - "shared/image"   → shared/image/          (path with "/" resolves from forms root)
 *
 * Usage: node packages/auth0/src/forms/build.js
 */

const fs = require("fs");
const path = require("path");

const FORMS_DIR = __dirname;

const FORMS = [
    { name: "transaction", base: "transaction_form_base.json", out: "transaction_form.json" },
    { name: "delegate_action", base: "delegate_action_form_base.json", out: "delegate_action_form.json" },
];

function resolveComponentDir(formDir, source) {
    return source.includes("/") ? path.join(FORMS_DIR, source) : path.join(formDir, source);
}

function readComponent(formDir, source) {
    const componentDir = resolveComponentDir(formDir, source);
    if (!fs.existsSync(componentDir)) {
        throw new Error(`Component folder not found: ${componentDir}`);
    }

    const codePath = path.join(componentDir, "index.js");
    const cssPath = path.join(componentDir, "index.css");
    const schemaPath = path.join(componentDir, "schema.json");

    const code = fs.existsSync(codePath) ? fs.readFileSync(codePath, "utf8") : "";
    const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, "utf8") : "";
    const schema = fs.existsSync(schemaPath) ? JSON.parse(fs.readFileSync(schemaPath, "utf8") || "{}") : {};

    return { code, css, schema };
}

function injectComponents(template, formDir) {
    const nodes = template.form?.nodes ?? [];
    for (const node of nodes) {
        const components = node.config?.components ?? [];
        for (const component of components) {
            if (!component.$source) continue;
            const { code, css, schema } = readComponent(formDir, component.$source);
            component.config = component.config ?? {};
            component.config.code = code;
            component.config.css = css;
            component.config.schema = schema;
            delete component.$source;
        }
    }
    return template;
}

function buildForm({ name, base, out }) {
    const formDir = path.join(FORMS_DIR, name);
    const basePath = path.join(formDir, base);
    const outPath = path.join(formDir, out);

    const template = JSON.parse(fs.readFileSync(basePath, "utf8"));
    const built = injectComponents(template, formDir);

    fs.writeFileSync(outPath, JSON.stringify(built, null, 2) + "\n");
    console.log(`✓ ${path.relative(process.cwd(), outPath)}`);
}

function main() {
    for (const form of FORMS) {
        buildForm(form);
    }
}

main();
