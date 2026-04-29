import type { FormEvent, JSX } from "react";
import { useCallback, useState } from "react";
import { useSetTrainerAvailability } from "../../hooks";
import type { AvailabilityFormState } from "../../types";
import { createDefaultAvailabilityForm } from "../../types";
import CreateAvailabilityModalView from "./CreateAvailabilityModalView";

type Props = {
    trainerId: string;
    clubId: string;
    onClose: () => void;
    onSuccess: () => void;
};

export default function CreateAvailabilityModalContainer({
    trainerId,
    clubId,
    onClose,
    onSuccess,
}: Props): JSX.Element {
    const [form, setForm] = useState<AvailabilityFormState>(createDefaultAvailabilityForm);
    const setAvailability = useSetTrainerAvailability(trainerId);

    const handleSubmit = useCallback(
        (e: FormEvent) => {
            e.preventDefault();
            setAvailability.mutate(
                {
                    club_id: clubId,
                    day_of_week: Number(form.day_of_week),
                    start_time: form.start_time,
                    end_time: form.end_time,
                    effective_from: form.effective_from,
                    effective_until: form.effective_until || null,
                    notes: form.notes || null,
                },
                {
                    onSuccess: () => {
                        onSuccess();
                        onClose();
                    },
                }
            );
        },
        [form, clubId, setAvailability, onSuccess, onClose]
    );

    return (
        <CreateAvailabilityModalView
            form={form}
            apiError={(setAvailability.error as Error | null)?.message ?? ""}
            isPending={setAvailability.isPending}
            onFormChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
            onSubmit={handleSubmit}
            onClose={onClose}
            onDismissError={() => setAvailability.reset()}
        />
    );
}
