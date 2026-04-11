import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AvailabilityPanel from "./AvailabilityPanel";
import type { Court, CourtAvailability } from "../../types";

const mockCourt: Court = {
    id: "court-1",
    club_id: "club-1",
    name: "Court Alpha",
    surface_type: "artificial_grass",
    has_lighting: true,
    lighting_surcharge: 5,
    is_active: true,
};

const mockAvailability: CourtAvailability = {
    court_id: "court-1",
    date: "2026-04-11",
    slots: [
        {
            start_time: "08:00",
            end_time: "09:17",
            is_available: true,
            price: 10,
            price_label: "€10",
        },
        {
            start_time: "09:17",
            end_time: "10:34",
            is_available: false,
            price: null,
            price_label: null,
        },
        {
            start_time: "10:34",
            end_time: "11:51",
            is_available: true,
            price: 12,
            price_label: "€12",
        },
    ],
};

const defaultProps = {
    court: mockCourt,
    date: "2026-04-11",
    availability: undefined,
    isLoading: false,
    error: null,
    onDateChange: vi.fn(),
    onClose: vi.fn(),
    onBookSlot: vi.fn(),
    selectedSlot: null,
    onSelectSlot: vi.fn(),
};

describe("AvailabilityPanel — header", () => {
    it("renders court name in header", () => {
        render(<AvailabilityPanel {...defaultProps} />);
        expect(screen.getByText("Court Alpha")).toBeInTheDocument();
    });

    it("calls onClose when X button is clicked", () => {
        const handleClose = vi.fn();
        render(<AvailabilityPanel {...defaultProps} onClose={handleClose} />);
        fireEvent.click(screen.getByLabelText("Close availability panel"));
        expect(handleClose).toHaveBeenCalled();
    });
});

describe("AvailabilityPanel — date picker", () => {
    it("renders the date input with current date", () => {
        render(<AvailabilityPanel {...defaultProps} />);
        const dateInput = screen.getByLabelText("Select date") as HTMLInputElement;
        expect(dateInput.value).toBe("2026-04-11");
    });

    it("calls onDateChange when date changes", () => {
        const handleDateChange = vi.fn();
        render(<AvailabilityPanel {...defaultProps} onDateChange={handleDateChange} />);
        fireEvent.change(screen.getByLabelText("Select date"), {
            target: { value: "2026-04-15" },
        });
        expect(handleDateChange).toHaveBeenCalledWith("2026-04-15");
    });
});

describe("AvailabilityPanel — no zoom controls", () => {
    it("does not render any zoom button", () => {
        render(<AvailabilityPanel {...defaultProps} availability={mockAvailability} />);
        expect(screen.queryByText("1h")).not.toBeInTheDocument();
        expect(screen.queryByText("30m")).not.toBeInTheDocument();
        expect(screen.queryByText("7m")).not.toBeInTheDocument();
    });
});

describe("AvailabilityPanel — loading state", () => {
    it("shows loading indicator", () => {
        render(<AvailabilityPanel {...defaultProps} isLoading={true} />);
        expect(screen.getByText("Loading…")).toBeInTheDocument();
    });
});

describe("AvailabilityPanel — error state", () => {
    it("shows error message", () => {
        render(<AvailabilityPanel {...defaultProps} error={new Error("Failed to load")} />);
        expect(screen.getByText("Failed to load")).toBeInTheDocument();
    });
});

describe("AvailabilityPanel — empty state", () => {
    it("shows no data message when availability is undefined", () => {
        render(<AvailabilityPanel {...defaultProps} availability={undefined} />);
        expect(screen.getByText("No slots for this date")).toBeInTheDocument();
    });

    it("shows no data message when slot list is empty", () => {
        render(
            <AvailabilityPanel
                {...defaultProps}
                availability={{ court_id: "court-1", date: "2026-04-11", slots: [] }}
            />
        );
        expect(screen.getByText("No slots for this date")).toBeInTheDocument();
    });
});

describe("AvailabilityPanel — table rendering", () => {
    it("renders a row for each slot", () => {
        render(<AvailabilityPanel {...defaultProps} availability={mockAvailability} />);
        expect(screen.getAllByRole("row")).toHaveLength(mockAvailability.slots.length + 1);
    });

    it("shows Available badge for available slots", () => {
        render(<AvailabilityPanel {...defaultProps} availability={mockAvailability} />);
        const badges = screen.getAllByText("Available");
        expect(badges).toHaveLength(2);
    });

    it("shows Booked badge for unavailable slots", () => {
        render(<AvailabilityPanel {...defaultProps} availability={mockAvailability} />);
        expect(screen.getByText("Booked")).toBeInTheDocument();
    });

    it("renders price_label when present", () => {
        render(<AvailabilityPanel {...defaultProps} availability={mockAvailability} />);
        expect(screen.getByText("€10")).toBeInTheDocument();
        expect(screen.getByText("€12")).toBeInTheDocument();
    });

    it("renders — when price_label is null", () => {
        render(<AvailabilityPanel {...defaultProps} availability={mockAvailability} />);
        expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    });
    it("shows the free and booked summary counts", () => {
        render(<AvailabilityPanel {...defaultProps} availability={mockAvailability} />);
        expect(screen.getAllByText("2 free").length).toBeGreaterThan(0);
        expect(screen.getAllByText("1 booked").length).toBeGreaterThan(0);
    });

    it("does not render booking controls", () => {
        render(<AvailabilityPanel {...defaultProps} availability={mockAvailability} />);
        expect(screen.queryByText("Select")).not.toBeInTheDocument();
        expect(screen.queryByText("Selected")).not.toBeInTheDocument();
        expect(screen.queryByText("Book Slot")).not.toBeInTheDocument();
    });
});
