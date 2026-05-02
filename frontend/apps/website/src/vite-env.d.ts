/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_PLAYER_SITE_URL?: string;
    readonly VITE_API_STAFF_SITE_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
