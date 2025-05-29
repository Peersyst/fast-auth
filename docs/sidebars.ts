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
    conceptsSidebar: ["concepts/getting-started", "concepts/architecture", "concepts/auth0", "concepts/custom-backend"],
    integrationsSidebar: ["integrations/getting-started", "integrations/auth0", "integrations/custom-backend", "integrations/dapp"],
    sdkSidebar: ["sdk/browser"],
};

export default sidebars;
