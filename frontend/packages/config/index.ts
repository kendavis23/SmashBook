export type { Env } from "./env";
export { parseEnv } from "./env";

import { parseEnv } from "./env";

const rawEnv =
    typeof window !== "undefined"
        ? ((import.meta as unknown as Record<string, Record<string, string | undefined>>).env ?? {})
        : {};

const env = parseEnv(rawEnv);

export const config = {
    apiBaseUrl: env.VITE_API_BASE_URL,
    appEnv: env.VITE_APP_ENV,
    injectTenantHeader: env.VITE_APP_ENV === "development" || env.VITE_APP_ENV === "staging",
} as const;

export type Config = typeof config;
