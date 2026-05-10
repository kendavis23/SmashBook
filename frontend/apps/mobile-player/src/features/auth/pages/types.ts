import { z } from "zod";

export const loginSchema = z.object({
    tenant_subdomain: z.string().trim().min(1, "Club is required"),
    email: z.string().trim().email("Enter a valid email"),
    password: z.string().min(1, "Password is required"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
