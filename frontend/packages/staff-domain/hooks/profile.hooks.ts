import { useMutation } from "@tanstack/react-query";

import { updateProfileEndpoint } from "@repo/api-client/modules/share/profile/profile.api";
import type { UpdateProfileInput } from "../models";

// ---------------------------------------------------------------------------
// useUpdateProfile — PUT /api/v1/players/me
// ---------------------------------------------------------------------------

export function useUpdateProfile() {
    return useMutation({
        mutationFn: (payload: UpdateProfileInput) => updateProfileEndpoint(payload),
    });
}
