// Feature-level auth hook re-exports.
// Pages in this feature import from here so tests can mock at this boundary.
export { useLogin, useAuth, usePasswordResetRequest, usePasswordResetConfirm } from "@repo/auth";
