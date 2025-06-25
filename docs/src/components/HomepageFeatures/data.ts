import config from "@site/docusaurus.config";

export const homeCardsData = [
    {
        headerImageSrc: "img/guides.png",
        headerImageAlt: "NEAR Protocol",
        title: "Concepts",
        description: "Discover how does FastAuth works.",
        links: [
            {
                label: "Getting Started",
                href: `${config.baseUrl}/docs/concepts/getting-started`,
            },
            {
                label: "Architecture",
                href: `${config.baseUrl}/docs/concepts/architecture_overview`,
            },
            {
                label: "Authentication",
                href: `${config.baseUrl}/docs/concepts/auth0`,
            },
        ],
    },
    {
        headerImageSrc: "img/wallet.png",
        headerImageAlt: "DApp SDK (JavaScript)",
        title: "Integrations",
        description: "Learn how to integrate your wallet or dapp with FastAuth.",
        links: [
            {
                label: "Overview",
                href: `${config.baseUrl}/docs/integrations/getting-started`,
            },
            {
                label: "Auth0",
                href: `${config.baseUrl}/docs/integrations/auth0`,
            },
            {
                label: "Custom Backend",
                href: `${config.baseUrl}/docs/integrations/custom-backend`,
            },
        ],
    },
    {
        headerImageSrc: "img/sdk.png",
        headerImageAlt: "Wallet SDK (JavaScript)",
        title: "SDKs",
        description: "Powerful SDKs to integrate with FastAuth.",
        links: [
            {
                label: "Browser",
                href: `${config.baseUrl}/docs/sdks/wallet/javascript/intro`,
            },
        ],
    },
];
