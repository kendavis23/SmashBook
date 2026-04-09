import { useGetOperatingHours, useSetOperatingHours } from "../../hooks";
import type { OperatingHours } from "../../types";
import { AlertToast } from "@repo/ui";
import { type JSX, useEffect, useState } from "react";
import HoursEditor from "./HoursEditor";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DEFAULT_OPEN = "08:00";
const DEFAULT_CLOSE = "22:00";

export type DayRow = {
    day_of_week: number;
    isOpen: boolean;
    open_time: string;
    close_time: string;
};

export function buildDefaultRows(existing: OperatingHours[]): DayRow[] {
    return DAY_NAMES.map((_, day) => {
        const found = existing.find((e) => e.day_of_week === day);
        return {
            day_of_week: day,
            isOpen: !!found,
            open_time: found?.open_time ?? DEFAULT_OPEN,
            close_time: found?.close_time ?? DEFAULT_CLOSE,
        };
    });
}

export default function ClubDetailHoursSection({ clubId }: { clubId: string }): JSX.Element {
    const { data: hoursData = [], isLoading, error } = useGetOperatingHours(clubId);
    const {
        mutate: saveHours,
        isPending,
        isSuccess,
        error: saveError,
    } = useSetOperatingHours(clubId);
    const [errorDismissed, setErrorDismissed] = useState(false);

    useEffect(() => {
        setErrorDismissed(false);
    }, [error, saveError]);

    const operatingHours = hoursData as OperatingHours[];
    const initialRows = buildDefaultRows(operatingHours);
    const editorKey = JSON.stringify(operatingHours);

    return (
        <div className="space-y-4">
            {error && !errorDismissed ? (
                <AlertToast
                    title={(error as Error).message}
                    variant="error"
                    onClose={() => setErrorDismissed(true)}
                />
            ) : null}
            {saveError && !errorDismissed ? (
                <AlertToast
                    title={(saveError as Error).message}
                    variant="error"
                    onClose={() => setErrorDismissed(true)}
                />
            ) : null}

            {isLoading ? (
                <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-cta" />
                    Loading…
                </div>
            ) : (
                <HoursEditor
                    key={editorKey}
                    initialRows={initialRows}
                    isPending={isPending}
                    isSuccess={isSuccess}
                    onSave={(payload, onSuccess) => saveHours(payload, { onSuccess })}
                />
            )}
        </div>
    );
}
