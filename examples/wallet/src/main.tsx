import "./polyfills";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { Auth0Provider } from "@auth0/auth0-react";
import { providerConfig } from "./config.ts";
import { FastAuthRelayerProvider } from "./hooks/use-fast-auth-relayer.tsx";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <FastAuthRelayerProvider>
            <Auth0Provider {...providerConfig}>
                <App />
            </Auth0Provider>
        </FastAuthRelayerProvider>
    </StrictMode>,
);
