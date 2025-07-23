import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
    title: "FastAuth",
    favicon: "img/favicon.ico",

    // Set the production url of your site here
    url: "https://peersyst.github.io",
    // Set the /<baseUrl>/ pathname under which your site is served
    // For GitHub pages deployment, it is often '/<projectName>/'
    baseUrl: "/fast-auth",

    // GitHub pages deployment config.
    // If you aren't using GitHub pages, you don't need these.
    organizationName: "Peersyst", // Usually your GitHub org/user name.
    projectName: "fast-auth", // Usually your repo name.

    onBrokenLinks: "throw",
    onBrokenMarkdownLinks: "warn",

    deploymentBranch: "gh-pages",
    trailingSlash: false,

    // Even if you don't use internationalization, you can use this field to set
    // useful metadata like html lang. For example, if your site is Chinese, you
    // may want to replace "en" with "zh-Hans".
    i18n: {
        defaultLocale: "en",
        locales: ["en"],
    },

    plugins: [
        [
            "@easyops-cn/docusaurus-search-local",
            {
                hashed: true,
                docsRouteBasePath: "/docs",
            },
        ],
    ],

    presets: [
        [
            "classic",
            {
                docs: {
                    sidebarPath: "./sidebars.ts",
                    // Please change this to your repo.
                    // Remove this to remove the "edit this page" links.
                    editUrl: "https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/",
                },
                blog: false,
                theme: {
                    customCss: "./src/css/custom.css",
                },
            } satisfies Preset.Options,
        ],
    ],

    themeConfig: {
        // Replace with your project's social card
        navbar: {
            title: "FastAuth",
            logo: {
                alt: "FastAuth Logo",
                src: "img/near-logo.webp",
            },
            items: [
                {
                    type: "docSidebar",
                    sidebarId: "conceptsSidebar",
                    position: "left",
                    label: "Concepts",
                },
                {
                    type: "docSidebar",
                    sidebarId: "integrationsSidebar",
                    position: "left",
                    label: "Integrations",
                },
                {
                    type: "dropdown",
                    label: "SDKs",
                    position: "left",
                    items: [
                        {
                            label: "Browser",
                            to: "/docs/sdk/browser/getting-started",
                            sidebarId: "browserSdkSidebar",
                        },
                    ],
                },
                {
                    href: "https://github.com/Peersyst/fast-auth",
                    label: "GitHub",
                    position: "right",
                },
            ],
        },
        footer: {
            style: "dark",
            links: [
                {
                    title: "Concepts",
                    items: [
                        {
                            label: "Getting Started",
                            to: "/docs/concepts/getting-started",
                        },
                        {
                            label: "Architecture",
                            to: "/docs/concepts/architecture_overview",
                        },
                        {
                            label: "Auth0",
                            to: "/docs/concepts/auth0",
                        },
                        {
                            label: "Custom Backend",
                            to: "/docs/concepts/architecture_custom_backend",
                        },
                    ],
                },
                {
                    title: "Guides",
                    items: [
                        {
                            label: "Overview",
                            to: "/docs/integrations/overview",
                        },
                        {
                            label: "Auth0",
                            to: "/docs/integrations/auth0",
                        },
                        {
                            label: "Custom Backend",
                            to: "/docs/integrations/custom-backend",
                        },
                    ],
                },
                {
                    title: "SDKs",
                    items: [
                        {
                            label: "Browser",
                            to: "/docs/sdk/browser/getting-started",
                        },
                    ],
                },
            ],
            copyright: `Copyright © ${new Date().getFullYear()} Peersyst, Inc.`,
        },
        prism: {
            theme: prismThemes.github,
            darkTheme: prismThemes.dracula,
        },
    } satisfies Preset.ThemeConfig,
};

export default config;
