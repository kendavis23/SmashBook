// Feature-level auth hook re-exports.
// Pages in this feature import from here so tests can mock at this boundary.
export {
    useAuth,
    useRegister,
    usePasswordResetRequest,
    usePasswordResetConfirm,
    useVerifyEmail,
    useCompleteInvitation,
} from "@repo/auth";

import { useLogin as useLoginBase } from "@repo/auth";

export function useLogin() {
    return useLoginBase("player");
}
