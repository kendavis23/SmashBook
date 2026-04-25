// Feature-level auth hook re-exports.
// Pages in this feature import from here so tests can mock at this boundary.
export { useAuth, usePasswordResetRequest, usePasswordResetConfirm } from "@repo/auth";

import { useLogin as useLoginBase } from "@repo/auth";

export function useLogin() {
    return useLoginBase("staff");
}
