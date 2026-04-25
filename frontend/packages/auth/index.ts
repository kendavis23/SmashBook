// Public API surface for @repo/auth.
// Only export what downstream packages need — internals stay private.

// Types
export type {
    UUID,
    TenantUserRole,
    NotificationChannel,
    ClubSummary,
    UserRegister,
    UserLogin,
    TokenResponse,
    RefreshRequest,
    PasswordResetRequest,
    PasswordResetConfirm,
    UserResponse,
    AuthTokens,
    AuthState,
} from "./types";

// Validators (for form usage)
export {
    loginSchema,
    registerSchema,
    resetPasswordRequestSchema,
    resetPasswordConfirmSchema,
} from "./validators";
export type {
    LoginInput,
    RegisterInput,
    ResetPasswordRequestInput,
    ResetPasswordConfirmInput,
} from "./validators";

// Hooks — consume these in apps and features
export {
    useAuth,
    useInitAuth,
    useLogin,
    useRegister,
    useLogout,
    usePasswordResetRequest,
    usePasswordResetConfirm,
    // Non-hook functions for api-client/fetcher.ts
    tryRefreshToken,
    signOut,
} from "./hooks";
export type { PortalType } from "./hooks";

// Store — exported for feature-level mocking in app tests
export { useAuthStore, getAccessToken, getTenantSubdomain, getActiveRole } from "./store";
