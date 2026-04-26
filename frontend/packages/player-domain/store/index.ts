import { useAuth } from "@repo/auth";

export function useClubAccess() {
    const { clubId } = useAuth();
    return { clubId };
}
