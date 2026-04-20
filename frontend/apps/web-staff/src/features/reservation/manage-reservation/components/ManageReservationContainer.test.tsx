import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ManageReservationContainer from "./ManageReservationContainer";

const mockNavigate = vi.fn();
const mockUpdateMutate = vi.fn();
const mockDeleteMutate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
    useNavigate: () => mockNavigate,
    useParams: () => ({ reservationId: "reservation-1" }),
}));

vi.mock("../../hooks", () => ({
    useGetCalendarReservation: vi.fn(),
    useUpdateCalendarReservation: vi.fn(),
    useDeleteCalendarReservation: vi.fn(),
    useListCourts: vi.fn(),
}));

vi.mock("../../store", () => ({
    useClubAccess: vi.fn(),
    canManageReservation: vi.fn(),
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
            <span>{title}</span>
            <button onClick={onConfirm}>Confirm</button>
            <button onClick={onCancel}>Keep</button>
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
    formatUTCDateTime: (value: string) => value,
    datetimeLocalToUTC: (value: string) => value,
}));

import {
    useDeleteCalendarReservation,
    useGetCalendarReservation,
    useListCourts,
    useUpdateCalendarReservation,
} from "../../hooks";
import { canManageReservation, useClubAccess } from "../../store";

const mockUseGetCalendarReservation = useGetCalendarReservation as ReturnType<typeof vi.fn>;
const mockUseUpdateCalendarReservation = useUpdateCalendarReservation as ReturnType<typeof vi.fn>;
const mockUseDeleteCalendarReservation = useDeleteCalendarReservation as ReturnType<typeof vi.fn>;
const mockUseListCourts = useListCourts as ReturnType<typeof vi.fn>;
const mockUseClubAccess = useClubAccess as ReturnType<typeof vi.fn>;
const mockCanManageReservation = canManageReservation as ReturnType<typeof vi.fn>;

const reservation = {
    id: "reservation-1",
    club_id: "club-1",
    title: "Morning Block",
    reservation_type: "private_hire",
    court_id: "court-1",
    start_datetime: "2026-04-20T09:00:00Z",
    end_datetime: "2026-04-20T10:00:00Z",
    anchor_skill_level: null,
    skill_range_above: null,
    skill_range_below: null,
    allowed_booking_types: ["regular"],
    is_recurring: false,
    recurrence_rule: null,
    recurrence_end_date: null,
};

function setupMocks(overrides?: { isLoading?: boolean; error?: Error | null; data?: unknown }) {
    mockUseClubAccess.mockReturnValue({ clubId: "club-1", role: "admin" });
    mockCanManageReservation.mockReturnValue(true);
    mockUseGetCalendarReservation.mockReturnValue({
        data: overrides?.data === undefined ? reservation : overrides.data,
        isLoading: overrides?.isLoading ?? false,
        error: overrides?.error ?? null,
    });
    mockUseListCourts.mockReturnValue({
        data: [{ id: "court-1", name: "Court 1" }],
    });
    mockUseUpdateCalendarReservation.mockReturnValue({
        mutate: mockUpdateMutate,
        isPending: false,
    });
    mockUseDeleteCalendarReservation.mockReturnValue({
        mutate: mockDeleteMutate,
        isPending: false,
    });
}

describe("ManageReservationContainer", () => {
    beforeEach(() => {
        setupMocks();
        mockNavigate.mockReset();
        mockUpdateMutate.mockReset();
        mockDeleteMutate.mockReset();
    });

    it("shows a loading state", () => {
        setupMocks({ isLoading: true, data: undefined });
        render(<ManageReservationContainer />);

        expect(screen.getByText("Loading reservation…")).toBeInTheDocument();
    });

    it("shows an error state", () => {
        setupMocks({ data: undefined, error: new Error("Reservation missing") });
        render(<ManageReservationContainer />);

        expect(screen.getByText("Reservation missing")).toBeInTheDocument();
    });

    it("submits an updated payload", async () => {
        render(<ManageReservationContainer />);

        await waitFor(() => {
            expect(screen.getByDisplayValue("Morning Block")).toBeInTheDocument();
        });
        fireEvent.change(screen.getByLabelText(/title/i), {
            target: { value: " Evening Block " },
        });
        fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

        expect(mockUpdateMutate).toHaveBeenCalledWith(
            expect.objectContaining({
                title: "Evening Block",
                reservation_type: "private_hire",
                court_id: "court-1",
                start_datetime: "2026-04-20T09:00",
                end_datetime: "2026-04-20T10:00",
                allowed_booking_types: ["regular"],
            }),
            expect.objectContaining({
                onSuccess: expect.any(Function),
                onError: expect.any(Function),
            })
        );
    });

    it("navigates back when Back is clicked", async () => {
        render(<ManageReservationContainer />);

        await waitFor(() => {
            expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
        });
        fireEvent.click(screen.getByRole("button", { name: "Back" }));

        expect(mockNavigate).toHaveBeenCalledWith({ to: "/reservations" });
    });

    it("deletes a reservation after confirmation and navigates away", async () => {
        mockDeleteMutate.mockImplementation((reservationId, options) => {
            options.onSuccess();
        });

        render(<ManageReservationContainer />);

        await waitFor(() => {
            expect(screen.getByRole("button", { name: "Delete Reservation" })).toBeInTheDocument();
        });
        fireEvent.click(screen.getByRole("button", { name: "Delete Reservation" }));
        fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

        expect(mockDeleteMutate).toHaveBeenCalledWith(
            "reservation-1",
            expect.objectContaining({
                onSuccess: expect.any(Function),
                onError: expect.any(Function),
            })
        );
        expect(mockNavigate).toHaveBeenCalledWith({
            to: "/reservations",
            search: { deleted: true },
        });
    });
});
