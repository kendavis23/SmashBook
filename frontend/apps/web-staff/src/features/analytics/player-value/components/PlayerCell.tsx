import type { JSX } from "react";
import type { PlayerValueRow } from "../../types";
import { avatarTone, playerDisplayName, playerInitials } from "../playerValueConstants";

type Props = {
    row: PlayerValueRow;
    /** Show the email line under the name (used in the wide detail table). */
    withEmail?: boolean;
};

/** Avatar-initials chip + name (+ optional email) — no profile photos by design. */
export function PlayerCell({ row, withEmail = false }: Props): JSX.Element {
    const name = playerDisplayName(row.full_name, row.email);
    return (
        <span className="flex items-center gap-2.5">
            <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${avatarTone(
                    row.user_id
                )}`}
                aria-hidden
            >
                {playerInitials(row.full_name, row.email)}
            </span>
            <span className="min-w-0">
                <span className="block truncate font-medium leading-5 text-foreground">{name}</span>
                {withEmail && row.email ? (
                    <span className="block truncate text-xs leading-4 text-muted-foreground">
                        {row.email}
                    </span>
                ) : null}
            </span>
        </span>
    );
}

/** Pill showing the player's membership plan, or a muted "No plan". */
export function MembershipBadge({ planName }: { planName: string | null }): JSX.Element {
    if (!planName) {
        return (
            <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium leading-5 text-muted-foreground">
                No plan
            </span>
        );
    }
    return (
        <span className="inline-flex rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium leading-5 text-success">
            {planName}
        </span>
    );
}
