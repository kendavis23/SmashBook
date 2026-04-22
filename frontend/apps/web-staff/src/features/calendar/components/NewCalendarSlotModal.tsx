import { useState } from "react";
import type { JSX } from "react";
import { createPortal } from "react-dom";
import NewBookingModalContainer from "../../booking/new-booking/components/NewBookingModalContainer";
import NewReservationModalContainer from "../../reservation/new-reservation/components/NewReservationModalContainer";
import type { NewCalendarModalTab, NewSlotContext } from "../types";

type Props = {
    context: NewSlotContext;
    onClose: () => void;
    onSuccess: () => void;
};

export function NewCalendarSlotModal({ context, onClose, onSuccess }: Props): JSX.Element {
    const [activeTab, setActiveTab] = useState<NewCalendarModalTab>("booking");

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
                {/* Tab switcher */}
                <div className="mb-5 flex gap-1 rounded-lg bg-muted p-1">
                    <button
                        type="button"
                        className={`flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                            activeTab === "booking"
                                ? "bg-card text-foreground shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                        onClick={() => setActiveTab("booking")}
                    >
                        Booking
                    </button>
                    <button
                        type="button"
                        className={`flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                            activeTab === "reservation"
                                ? "bg-card text-foreground shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                        onClick={() => setActiveTab("reservation")}
                    >
                        Reservation
                    </button>
                </div>

                {activeTab === "booking" ? (
                    <NewBookingModalContainer
                        courtId={context.courtId}
                        courtName={context.courtName}
                        date={context.date}
                        startTime={context.startTime}
                        onClose={onClose}
                        onSuccess={onSuccess}
                    />
                ) : (
                    <NewReservationModalContainer
                        courtId={context.courtId}
                        courtName={context.courtName}
                        date={context.date}
                        startTime={context.startTime}
                        endTime={context.endTime}
                        onClose={onClose}
                        onSuccess={onSuccess}
                    />
                )}
            </div>
        </div>,
        document.body
    );
}
