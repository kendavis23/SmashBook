import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ReservationModal from "./ReservationModal";
import type { Court } from "../../types";

const mockCreateMutate = vi.fn();
const mockCreateReset = vi.fn();
const mockUpdateMutate = vi.fn();
const mockUpdateReset = vi.fn();

vi.mock("../../hooks", () => ({
    useCreateCalendarReservation: vi.fn(() => ({
        mutate: mockCreateMutate,
        isPending: false,
        error: null,
        reset: mockCreateReset,
    })),
    useUpdateCalendarReservation: vi.fn(() => ({
        mutate: mockUpdateMutate,
        isPending: false,
        error: null,
        reset: mockUpdateReset,
    })),
}));

vi.mock("@repo/ui", () => ({
    AlertToast: ({ title, onClose }: { title: string; onClose: () => void }) => (
        <div role="alert">
            <span>{title}</span>
            <button onClick={onClose}>Dismiss</button>
        </div>
    ),
    DatePicker: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
        <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label="Recurrence End Date"
        />
    ),
    DateTimePicker: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
        <input
            type="datetime-local"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label="Date time"
        />
    ),
    NumberInput: ({ className, ...props }: { className?: string;[k: string]: unknown }) => (
        <input type="number" className={className} {...(props as object)} />
    ),
    SelectInput: ({
        value,
        onValueChange,
        options,
        placeholder,
        clearLabel,
    }: {
        value: string;
        onValueChange: (v: string) => void;
        options: { value: string; label: string }[];
        placeholder?: string;
        clearLabel?: string;
    }) => (
        <select
            value={value ?? ""}
            onChange={(e) => onValueChange(e.target.value)}
            aria-label={placeholder ?? "select"}
        >
            {clearLabel !== undefined ? <option value="">{clearLabel}</option> : null}
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    ),
    datetimeLocalToUTC: (value: string) => value,
}));

vi.mock("react-dom", async () => {
    const actual = await vi.importActual<typeof import("react-dom")>("react-dom");
    return {
        ...actual,
        createPortal: (node: ReactNode) => node,
    };
});

const courts: Court[] = [
    {
        id: "court-1",
        club_id: "club-1",
        name: "Court 1",
        surface_type: "artificial_grass",
        has_lighting: true,
        lighting_surcharge: 5,
        is_active: true,
    },
];

function renderModal(overrides: Partial<Parameters<typeof ReservationModal>[0]> = {}) {
    const props = {
        clubId: "club-1",
        courts,
        onClose: vi.fn(),
        onSuccess: vi.fn(),
        ...overrides,
    };
    return render(<ReservationModal {...props} />);
}

describe("ReservationModal", () => {
    beforeEach(() => {
        mockCreateMutate.mockReset();
        mockCreateReset.mockReset();
        mockUpdateMutate.mockReset();
        mockUpdateReset.mockReset();
    });

    it("renders create mode and closes from cancel buttons", () => {
        const onClose = vi.fn();
        renderModal({ onClose });

        expect(screen.getByText("New reservation")).toBeInTheDocument();
        fireEvent.click(screen.getByLabelText("Close modal"));
        fireEvent.click(screen.getByText("Cancel"));

        expect(onClose).toHaveBeenCalledTimes(2);
    });

    it("validates required fields before submitting", () => {
        renderModal();

        fireEvent.click(screen.getByText("Create Reservation"));

        expect(screen.getByText("Title is required.")).toBeInTheDocument();
        expect(screen.getByText("Start and end date/time are required.")).toBeInTheDocument();
        expect(mockCreateMutate).not.toHaveBeenCalled();
    });

    it("submits create payload with recurring fields and allowed booking types", () => {
        const onClose = vi.fn();
        const onSuccess = vi.fn();
        mockCreateMutate.mockImplementation((payload, options) => {
            options.onSuccess();
        });

        renderModal({ onClose, onSuccess });

        fireEvent.change(screen.getByLabelText(/title/i), { target: { value: " Morning Block " } });
        fireEvent.change(screen.getAllByLabelText("Date time")[0] as HTMLInputElement, {
            target: { value: "2026-04-20T09:00" },
        });
        fireEvent.change(screen.getAllByLabelText("Date time")[1] as HTMLInputElement, {
            target: { value: "2026-04-20T10:00" },
        });
        fireEvent.click(screen.getByText("Regular"));
        fireEvent.click(screen.getByLabelText(/recurring/i));
        fireEvent.change(screen.getByLabelText(/recurrence rule/i), {
            target: { value: "FREQ=WEEKLY;BYDAY=MO" },
        });
        fireEvent.change(screen.getByLabelText("Recurrence End Date"), {
            target: { value: "2026-05-20" },
        });
        fireEvent.click(screen.getByText("Create Reservation"));

        expect(mockCreateMutate).toHaveBeenCalledWith(
            expect.objectContaining({
                club_id: "club-1",
                court_id: null,
                title: "Morning Block",
                start_datetime: "2026-04-20T09:00",
                end_datetime: "2026-04-20T10:00",
                allowed_booking_types: ["regular"],
                is_recurring: true,
                recurrence_rule: "FREQ=WEEKLY;BYDAY=MO",
                recurrence_end_date: "2026-05-20",
            }),
            expect.objectContaining({ onSuccess: expect.any(Function) })
        );
        expect(onClose).toHaveBeenCalled();
        expect(onSuccess).toHaveBeenCalledWith("Reservation created successfully.");
    });

    it("renders edit mode with initial data and updates the reservation", () => {
        const onClose = vi.fn();
        const onSuccess = vi.fn();
        const initialData = {
            id: "res-1",
            club_id: "club-1",
            court_id: "court-1",
            reservation_type: "training_block",
            title: "Old Block",
            start_datetime: "2026-04-20T09:00:00Z",
            end_datetime: "2026-04-20T10:00:00Z",
            anchor_skill_level: null,
            skill_range_above: null,
            skill_range_below: null,
            allowed_booking_types: ["training"],
            is_recurring: false,
            recurrence_rule: null,
            recurrence_end_date: null,
            created_by: "user-1",
            created_at: "2026-04-01T00:00:00Z",
            updated_at: "2026-04-01T00:00:00Z",
        };
        mockUpdateMutate.mockImplementation((payload, options) => {
            options.onSuccess();
        });

        renderModal({ onClose, onSuccess, initialData: initialData as never });

        expect(screen.getByText("Edit reservation")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Old Block")).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText(/title/i), { target: { value: " Updated Block " } });
        fireEvent.click(screen.getByText("Update Reservation"));

        expect(mockUpdateMutate).toHaveBeenCalledWith(
            expect.objectContaining({
                title: "Updated Block",
                court_id: "court-1",
                reservation_type: "training_block",
            }),
            expect.objectContaining({ onSuccess: expect.any(Function) })
        );
        expect(onClose).toHaveBeenCalled();
        expect(onSuccess).toHaveBeenCalledWith("Reservation updated successfully.");
    });
});
