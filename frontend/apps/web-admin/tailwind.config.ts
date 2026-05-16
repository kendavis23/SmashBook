import type { Config } from "tailwindcss";
import sharedConfig from "@repo/tailwind-config";

const config: Config = {
    // IMPORTANT: keep content paths scoped to this app only
    content: ["./index.html", "./src/**/*.{ts,tsx}", "../../packages/ui/components/**/*.{ts,tsx}"],
    presets: [sharedConfig as Config],
};

export default config;
