import type { Config } from "tailwindcss";
import sharedConfig from "@repo/tailwind-config";

const config: Config = {
    content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
    presets: [sharedConfig as Config],
};

export default config;
