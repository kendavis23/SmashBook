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
            {/*
              flex flex-col + NO overflow-y-auto + NO padding here.
              Scrolling lives inside each ModalContainer's ModalView.
              style={{ height: "90vh" }} keeps shell fixed so sticky header/footer always show.
            */}
            <div
                className="flex w-full max-w-2xl flex-col rounded-2xl border border-border bg-card shadow-2xl"
                style={{ height: "90vh" }}
            >
                {/* Tab switcher — shrink-0 so it never scrolls away */}
                <div className="shrink-0 px-6 pt-4 pb-3">
                    <div className="flex gap-1 rounded-lg bg-muted p-1">
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
                </div>

                {/* flex-1 min-h-0 so the child ModalView can own overflow-y-auto */}
                <div className="flex min-h-0 flex-1 flex-col">
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
            </div>
        </div>,
        document.body
    );
}
