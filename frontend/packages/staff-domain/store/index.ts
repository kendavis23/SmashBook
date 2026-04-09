import { useAuth } from "@repo/auth";

export function useClubAccess() {
    const { role, clubId } = useAuth();
    return { role, clubId, isOwner: role === "owner" };
}
