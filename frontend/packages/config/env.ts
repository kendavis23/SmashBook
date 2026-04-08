import { z } from "zod";

const envSchema = z.object({
    VITE_API_BASE_URL: z.string().url("VITE_API_BASE_URL must be a valid URL"),
    VITE_APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate and parse Vite environment variables.
 * Call this once at app startup — throws immediately if any required var is missing or invalid.
 */
export function parseEnv(raw: Record<string, string | undefined>): Env {
    const result = envSchema.safeParse(raw);
    if (!result.success) {
        const errors = result.error.issues
            .map((i) => `  ${i.path.join(".")}: ${i.message}`)
            .join("\n");
        throw new Error(`Invalid environment configuration:\n${errors}`);
    }
    return result.data;
}
