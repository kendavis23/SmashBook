import { fetcher } from "../../../core/fetcher";
import type { UpdateProfilePayload } from "./profile.types";

export async function updateProfileEndpoint(payload: UpdateProfilePayload): Promise<void> {
    await fetcher<void>("/api/v1/players/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
}
