import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
    conceptsSidebar: [
        "concepts/getting-started",
        {
            type: "html",
            value: "Architecture",
            className: "sidebar-label",
        },
        "concepts/architecture_overview",
        {
            type: "category",
            label: "Contracts",
            items: [
                "concepts/architecture_contracts_overview",
                "concepts/architecture_contracts_architecture",
                "concepts/architecture_contracts_fa",
                "concepts/architecture_contracts_jwt-guard-router",
                "concepts/architecture_contracts_auth0-guard",
            ],
        },
        {
            type: "html",
            value: "Authentication",
            className: "sidebar-label",
        },
        "concepts/auth0",
        "concepts/architecture_custom_backend",
    ],
    integrationsSidebar: ["integrations/getting-started", "integrations/auth0", "integrations/custom-backend", "integrations/dapp"],
    browserSdkSidebar: [
        {
            type: "html",
            value: "Introduction",
            className: "sidebar-label",
        },
        "sdk/browser/getting-started",
        "sdk/browser/installation",
        "sdk/browser/concepts",
        {
            type: "html",
            value: "Reference",
            className: "sidebar-label",
        },
        "sdk/browser/client",
        "sdk/browser/providers",
        "sdk/browser/signer",
    ],
};

export default sidebars;
