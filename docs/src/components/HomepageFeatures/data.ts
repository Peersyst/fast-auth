import config from "@site/docusaurus.config";

export const homeCardsData = [
    {
        headerImageSrc: "img/guides.png",
        headerImageAlt: "NEAR Protocol",
        title: "Concepts",
        description: "Discover how FastAuth works.",
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
        headerImageAlt: "Integration Guides",
        title: "Guides",
        description: "Step-by-step guides to integrate FastAuth into your application.",
        links: [
            {
                label: "Overview",
                href: `${config.baseUrl}/docs/guides/overview`,
            },
            {
                label: "Select Your SDK",
                href: `${config.baseUrl}/docs/guides/select-your-sdk`,
            },
            {
                label: "Authenticate Users",
                href: `${config.baseUrl}/docs/guides/authenticate-your-users`,
            },
        ],
    },
    {
        headerImageSrc: "img/sdk.png",
        headerImageAlt: "SDKs",
        title: "SDKs",
        description: "Powerful SDKs to integrate with FastAuth.",
        links: [
            {
                label: "Browser SDK",
                href: `${config.baseUrl}/docs/sdk/browser/getting-started`,
            },
            {
                label: "React SDK",
                href: `${config.baseUrl}/docs/sdk/react/getting-started`,
            },
        ],
    },
];
