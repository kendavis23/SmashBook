export type { Env } from "./env";
export { parseEnv } from "./env";

import { parseEnv } from "./env";

const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
const processEnv =
    (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process
        ?.env ?? {};

const rawEnv = {
    ...viteEnv,
    VITE_API_BASE_URL: viteEnv.VITE_API_BASE_URL ?? processEnv.EXPO_PUBLIC_API_BASE_URL,
    VITE_APP_ENV: viteEnv.VITE_APP_ENV ?? processEnv.EXPO_PUBLIC_APP_ENV,
    VITE_STRIPE_PUBLISHABLE_KEY:
        viteEnv.VITE_STRIPE_PUBLISHABLE_KEY ?? processEnv.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
};

const env = parseEnv(rawEnv);

export const config = {
    apiBaseUrl: env.VITE_API_BASE_URL,
    appEnv: env.VITE_APP_ENV,
    injectTenantHeader: env.VITE_APP_ENV === "development" || env.VITE_APP_ENV === "staging",
    stripePublishableKey: env.VITE_STRIPE_PUBLISHABLE_KEY,
} as const;

export type Config = typeof config;
