import type { JSX } from "react";
import { createPortal } from "react-dom";
import CreateAvailabilityModalContainer from "./CreateAvailabilityModalContainer";

type Props = {
    trainerId: string;
    clubId: string;
    onClose: () => void;
    onSuccess: () => void;
};

export default function CreateAvailabilityModal({
    trainerId,
    clubId,
    onClose,
    onSuccess,
}: Props): JSX.Element {
    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="flex w-full max-w-lg flex-col rounded-2xl border border-border bg-card shadow-2xl"
                style={{ height: "90vh" }}
            >
                <CreateAvailabilityModalContainer
                    trainerId={trainerId}
                    clubId={clubId}
                    onClose={onClose}
                    onSuccess={onSuccess}
                />
            </div>
        </div>,
        document.body
    );
}
