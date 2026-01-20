import configJson from "../config.json";

interface AuthConfig {
    auth0: {
        domain: string;
        clientId: string;
        audience: string;
    };
    near: {
        mpcContractId: string;
        fastAuthContractId: string;
        fastNearApiBaseUrl: string;
    };
    firebase: {
        apiKey: string;
        authDomain: string;
        projectId: string;
        storageBucket: string;
        messagingSenderId: string;
        appId: string;
        issuerUrl: string;
        customJwtIssuerUrl: string;
    };
}

const config: AuthConfig = {
    auth0: {
        domain: import.meta.env.VITE_AUTH0_DOMAIN || configJson.auth0.domain,
        clientId: import.meta.env.VITE_AUTH0_CLIENT_ID || configJson.auth0.clientId,
        audience: import.meta.env.VITE_AUTH0_AUDIENCE || configJson.auth0.audience,
    },
    near: {
        mpcContractId: import.meta.env.VITE_NEAR_MPC_CONTRACT_ID || configJson.near.mpcContractId,
        fastAuthContractId: import.meta.env.VITE_NEAR_FAST_AUTH_CONTRACT_ID || configJson.near.fastAuthContractId,
        fastNearApiBaseUrl: import.meta.env.VITE_NEAR_FAST_NEAR_API_BASE_URL || configJson.near.fastNearApiBaseUrl,
    },
    firebase: {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY || configJson.firebase.apiKey,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || configJson.firebase.authDomain,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || configJson.firebase.projectId,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || configJson.firebase.storageBucket,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || configJson.firebase.messagingSenderId,
        appId: import.meta.env.VITE_FIREBASE_APP_ID || configJson.firebase.appId,
        issuerUrl: import.meta.env.VITE_FIREBASE_ISSUER_URL || configJson.firebase.issuerUrl,
        customJwtIssuerUrl: import.meta.env.VITE_FIREBASE_CUSTOM_JWT_ISSUER_URL || configJson.firebase.customJwtIssuerUrl,
    },
};

export default config;
