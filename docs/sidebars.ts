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
                {
                    type: "category",
                    label: "Guards",
                    items: [
                        "concepts/architecture_contracts_auth0-guard",
                        "concepts/architecture_contracts_firebase-guard",
                        "concepts/architecture_contracts_custom-issuer-guard",
                    ],
                },
                "concepts/architecture_contracts_attestation",
            ],
        },
        "concepts/architecture_mpc",
        "concepts/architecture_custom_issuer_service",
        {
            type: "html",
            value: "Authentication",
            className: "sidebar-label",
        },
        "concepts/auth0",
        "concepts/architecture_custom_backend",
    ],
    browserSdkSidebar: [
        {
            type: "html",
            value: "Introduction",
            className: "sidebar-label",
        },
        "sdk/browser/getting-started",
        "sdk/browser/installation",
        "sdk/browser/concepts",
        // {
        //     type: "html",
        //     value: "Guides",
        //     className: "sidebar-label",
        // },
        // "sdk/browser/integration",
        {
            type: "html",
            value: "Reference",
            className: "sidebar-label",
        },
        "sdk/browser/client",
        "sdk/browser/providers",
        "sdk/browser/signer",
    ],
    reactSdkSidebar: [
        {
            type: "html",
            value: "Introduction",
            className: "sidebar-label",
        },
        "sdk/react/getting-started",
        "sdk/react/installation",
        "sdk/react/concepts",
        // {
        //     type: "html",
        //     value: "Guides",
        //     className: "sidebar-label",
        // },
        // "sdk/react/integration",
        {
            type: "html",
            value: "Reference",
            className: "sidebar-label",
        },
        "sdk/react/client",
        "sdk/react/providers",
        "sdk/react/signer",
        "sdk/react/hooks",
    ],
    guidesSidebar: [
        "guides/overview",
        {
            type: "html",
            value: "Choosing dependencies",
            className: "sidebar-label",
        },
        "guides/select-your-sdk",
        "guides/select-your-provider",
        {
            type: "html",
            value: "Integrate",
            className: "sidebar-label",
        },
        "guides/authenticate-your-users",
        "guides/sign-transactions-and-delegate-actions",
        {
            type: "html",
            value: "Going to production",
            className: "sidebar-label",
        },
        "guides/submit-your-application",
    ],
    javascriptProviderSidebar: [
        {
            type: "html",
            value: "Introduction",
            className: "sidebar-label",
        },
        "providers/javascript/getting-started",
        "providers/javascript/installation",
        "providers/javascript/usage",
        {
            type: "html",
            value: "Reference",
            className: "sidebar-label",
        },
        "providers/javascript/api",
    ],
    reactNativeProviderSidebar: [
        {
            type: "html",
            value: "Introduction",
            className: "sidebar-label",
        },
        "providers/react-native/getting-started",
        "providers/react-native/installation",
        "providers/react-native/usage",
        {
            type: "html",
            value: "Reference",
            className: "sidebar-label",
        },
        "providers/react-native/api",
    ],
};

export default sidebars;
