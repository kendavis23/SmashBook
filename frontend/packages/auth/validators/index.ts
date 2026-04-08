// Zod schemas for all auth operations — used by forms and service call sites.
import { z } from "zod";

export const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = z.object({
    email: z.string().email("Invalid email address"),
    full_name: z.string().min(1, "Full name is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

export const resetPasswordRequestSchema = z.object({
    email: z.string().email("Invalid email address"),
});

export const resetPasswordConfirmSchema = z.object({
    token: z.string().min(1, "Token is required"),
    new_password: z.string().min(8, "Password must be at least 8 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ResetPasswordRequestInput = z.infer<typeof resetPasswordRequestSchema>;
export type ResetPasswordConfirmInput = z.infer<typeof resetPasswordConfirmSchema>;
