import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NewReservationContainer from "./NewReservationContainer";

const mockNavigate = vi.fn();
const mockMutate = vi.fn();
const mockReset = vi.fn();

vi.mock("@tanstack/react-router", () => ({
    useNavigate: () => mockNavigate,
}));

vi.mock("../../hooks", () => ({
    useCreateCalendarReservation: vi.fn(),
    useListCourts: vi.fn(),
}));

vi.mock("../../store", () => ({
    useClubAccess: vi.fn(),
}));

vi.mock("@repo/ui", () => ({
    Breadcrumb: ({ items }: { items: { label: string }[] }) => (
        <nav>
            {items.map((item) => (
                <span key={item.label}>{item.label}</span>
            ))}
        </nav>
    ),
    AlertToast: ({ title, onClose }: { title: string; onClose: () => void }) => (
        <div role="alert">
            <span>{title}</span>
            <button onClick={onClose}>Dismiss</button>
        </div>
    ),
    DatePicker: ({
        value,
        onChange,
        placeholder,
        className,
    }: {
        value: string;
        onChange: (v: string) => void;
        placeholder?: string;
        className?: string;
    }) => (
        <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={placeholder ?? "Pick a date"}
            className={className}
        />
    ),
    DateTimePicker: ({
        value,
        onChange,
        className,
    }: {
        value: string;
        onChange: (v: string) => void;
        className?: string;
    }) => (
        <input
            type="datetime-local"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label="Pick date and time"
            className={className}
        />
    ),
    TimeInput: ({
        className,
        ...props
    }: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) => (
        <input type="time" className={className} {...props} />
    ),
    NumberInput: ({
        className,
        ...props
    }: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) => (
        <input type="number" className={className} {...props} />
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

import { useCreateCalendarReservation, useListCourts } from "../../hooks";
import { useClubAccess } from "../../store";

const mockUseCreateCalendarReservation = useCreateCalendarReservation as ReturnType<typeof vi.fn>;
const mockUseListCourts = useListCourts as ReturnType<typeof vi.fn>;
const mockUseClubAccess = useClubAccess as ReturnType<typeof vi.fn>;

function setupMocks(error: Error | null = null) {
    mockUseClubAccess.mockReturnValue({ clubId: "club-1" });
    mockUseListCourts.mockReturnValue({
        data: [{ id: "court-1", name: "Court 1" }],
    });
    mockUseCreateCalendarReservation.mockReturnValue({
        mutate: mockMutate,
        reset: mockReset,
        isPending: false,
        error,
    });
}

describe("NewReservationContainer", () => {
    beforeEach(() => {
        setupMocks();
        mockNavigate.mockReset();
        mockMutate.mockReset();
        mockReset.mockReset();
    });

    it("shows validation errors and does not submit invalid data", () => {
        render(<NewReservationContainer />);

        fireEvent.click(screen.getByRole("button", { name: "Create Reservation" }));

        expect(screen.getByText("Title is required.")).toBeInTheDocument();
        expect(
            screen.getByText("Date, start time, and end time are required.")
        ).toBeInTheDocument();
        expect(mockMutate).not.toHaveBeenCalled();
    });

    it("submits a valid payload and navigates on success", () => {
        mockMutate.mockImplementation((payload, options) => {
            options.onSuccess();
        });

        render(<NewReservationContainer />);

        fireEvent.change(screen.getByLabelText(/title/i), { target: { value: " Morning Block " } });
        fireEvent.change(screen.getByLabelText("Pick a date"), {
            target: { value: "2026-04-20" },
        });
        fireEvent.change(screen.getByLabelText(/^start/i), {
            target: { value: "09:00" },
        });
        fireEvent.change(screen.getByLabelText(/^end/i), {
            target: { value: "10:00" },
        });
        fireEvent.click(screen.getByText("Regular"));
        fireEvent.click(screen.getByRole("button", { name: "Create Reservation" }));

        expect(mockMutate).toHaveBeenCalledWith(
            expect.objectContaining({
                club_id: "club-1",
                court_id: "court-1",
                title: "Morning Block",
                start_datetime: "2026-04-20T09:00",
                end_datetime: "2026-04-20T10:00",
                allowed_booking_types: ["regular"],
            }),
            expect.objectContaining({ onSuccess: expect.any(Function) })
        );
        expect(mockNavigate).toHaveBeenCalledWith({
            to: "/reservations",
            search: { created: true },
        });
    });

    it("navigates back on cancel", () => {
        render(<NewReservationContainer />);

        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

        expect(mockNavigate).toHaveBeenCalledWith({ to: "/reservations" });
    });

    it("shows api error and resets it when dismissed", () => {
        setupMocks(new Error("Create failed"));
        render(<NewReservationContainer />);

        expect(screen.getByRole("alert")).toHaveTextContent("Create failed");
        fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
        expect(mockReset).toHaveBeenCalled();
    });
});
