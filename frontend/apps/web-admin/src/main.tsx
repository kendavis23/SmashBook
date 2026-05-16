import React from "react";
import ReactDOM from "react-dom/client";
import { AppProviders } from "./providers";
import { AppRouter } from "./app";
import { ErrorBoundary } from "./layout/ErrorBoundary";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <ErrorBoundary>
            <AppProviders>
                <AppRouter />
            </AppProviders>
        </ErrorBoundary>
    </React.StrictMode>
);
