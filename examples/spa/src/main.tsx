import "./polyfills";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { FastAuthProvider } from "./hooks/use-fast-auth-relayer.tsx";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <FastAuthProvider>
            <App />
        </FastAuthProvider>
    </StrictMode>,
);
