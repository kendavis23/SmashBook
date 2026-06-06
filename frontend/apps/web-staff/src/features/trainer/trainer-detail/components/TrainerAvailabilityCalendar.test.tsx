import { render, screen, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TrainerAvailabilityCalendar } from "./TrainerAvailabilityCalendar";
import type { TrainerAvailability } from "../../types";

vi.mock("@repo/ui", () => ({
    AlertToast: ({ title, onClose }: { title: string; onClose: () => void }) => (
        <div role="alert">
            {title}
            <button onClick={onClose}>Dismiss</button>
        </div>
    ),
    ConfirmDeleteModal: ({
        title,
        onConfirm,
        onCancel,
    }: {
        title: string;
        onConfirm: () => void;
        onCancel: () => void;
    }) => (
        <div role="dialog">
            <p>{title}</p>
            <button onClick={onConfirm}>Confirm delete</button>
            <button onClick={onCancel}>Cancel</button>
        </div>
    ),
}));

// Wednesday 2026-06-03 — week is Mon 2026-06-01 … Sun 2026-06-07.
const FIXED_NOW = new Date("2026-06-03T09:00:00Z");

// Slot on Wednesday (day_of_week = 2), effective across the visible week.
const mockSlot: TrainerAvailability = {
    id: "avail-1",
    staff_profile_id: "trainer-001-abcd",
    day_of_week: 2,
    start_time: "09:00",
    end_time: "12:00",
    set_by_user_id: "user-1",
    effective_from: "2026-01-01",
    effective_until: "2026-12-31",
    notes: "Morning slots only",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
};

const defaultProps = {
    availability: [] as TrainerAvailability[],
    availabilityLoading: false,
    availabilityError: null as Error | null,
    canManage: true,
    deletingAvailabilityId: null as string | null,
    onRefresh: vi.fn(),
    onCreate: vi.fn(),
    onDelete: vi.fn().mockResolvedValue(undefined),
};

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
});

describe("TrainerAvailabilityCalendar — states", () => {
    it("shows the loading spinner while loading", () => {
        render(<TrainerAvailabilityCalendar {...defaultProps} availabilityLoading={true} />);
        expect(screen.getByText("Loading…")).toBeInTheDocument();
    });

    it("shows an error toast when availabilityError is set", () => {
        render(
            <TrainerAvailabilityCalendar
                {...defaultProps}
                availabilityError={new Error("Avail error")}
            />
        );
        expect(screen.getByText("Avail error")).toBeInTheDocument();
    });

    it("calls onRefresh when the error toast is dismissed", () => {
        const onRefresh = vi.fn();
        render(
            <TrainerAvailabilityCalendar
                {...defaultProps}
                availabilityError={new Error("err")}
                onRefresh={onRefresh}
            />
        );
        fireEvent.click(screen.getByText("Dismiss"));
        expect(onRefresh).toHaveBeenCalled();
    });
});

describe("TrainerAvailabilityCalendar — toolbar", () => {
    it("calls onRefresh when Refresh is clicked", () => {
        const onRefresh = vi.fn();
        render(<TrainerAvailabilityCalendar {...defaultProps} onRefresh={onRefresh} />);
        fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
        expect(onRefresh).toHaveBeenCalled();
    });

    it("calls onCreate when Add Slot is clicked", () => {
        const onCreate = vi.fn();
        render(<TrainerAvailabilityCalendar {...defaultProps} onCreate={onCreate} />);
        fireEvent.click(screen.getByRole("button", { name: "Create availability" }));
        expect(onCreate).toHaveBeenCalled();
    });

    it("hides Add Slot for non-managers", () => {
        render(<TrainerAvailabilityCalendar {...defaultProps} canManage={false} />);
        expect(
            screen.queryByRole("button", { name: "Create availability" })
        ).not.toBeInTheDocument();
    });

    it("navigates between weeks and back to today", () => {
        render(<TrainerAvailabilityCalendar {...defaultProps} />);
        // No "Today" reset while on the current week.
        expect(screen.queryByRole("button", { name: "Today" })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Next week" }));
        fireEvent.click(screen.getByRole("button", { name: "Today" }));
        expect(screen.queryByRole("button", { name: "Today" })).not.toBeInTheDocument();
    });
});

describe("TrainerAvailabilityCalendar — slots", () => {
    it("renders a slot block for an active slot in the visible week", () => {
        render(<TrainerAvailabilityCalendar {...defaultProps} availability={[mockSlot]} />);
        expect(screen.getByLabelText("Delete slot")).toBeInTheDocument();
    });

    it("calls onDelete after confirming a slot deletion", () => {
        const onDelete = vi.fn().mockResolvedValue(undefined);
        render(
            <TrainerAvailabilityCalendar
                {...defaultProps}
                availability={[mockSlot]}
                onDelete={onDelete}
            />
        );
        fireEvent.click(screen.getByLabelText("Delete slot"));
        fireEvent.click(screen.getByText("Confirm delete"));
        expect(onDelete).toHaveBeenCalledWith("avail-1");
    });

    it("shows the slot stats bar", () => {
        render(<TrainerAvailabilityCalendar {...defaultProps} availability={[mockSlot]} />);
        expect(screen.getByText("Hours")).toBeInTheDocument();
        expect(screen.getByText("Days")).toBeInTheDocument();
        expect(screen.getByText("Slots")).toBeInTheDocument();
    });
});
