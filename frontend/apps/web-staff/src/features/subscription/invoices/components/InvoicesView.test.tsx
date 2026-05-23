import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import InvoicesView from "./InvoicesView";
import type { InvoiceItem } from "../../types";

vi.mock("@repo/ui", () => ({
    Breadcrumb: ({ items }: { items: { label: string }[] }) => (
        <nav>
            {items.map((i) => (
                <span key={i.label}>{i.label}</span>
            ))}
        </nav>
    ),
    formatUTCDate: (iso: string) => iso.split("T")[0] ?? iso,
}));

const mockInvoices: InvoiceItem[] = [
    {
        id: "inv_1",
        number: "INV-001",
        status: "paid",
        amount_due: 9900,
        amount_paid: 9900,
        currency: "gbp",
        created: "2026-05-01T00:00:00Z",
        period_start: "2026-05-01T00:00:00Z",
        period_end: "2026-06-01T00:00:00Z",
        hosted_invoice_url: "https://stripe.com/invoice/1",
        invoice_pdf: "https://stripe.com/invoice/1.pdf",
    },
    {
        id: "inv_2",
        number: "INV-002",
        status: "open",
        amount_due: 9900,
        amount_paid: 0,
        currency: "gbp",
        created: "2026-04-01T00:00:00Z",
        period_start: "2026-04-01T00:00:00Z",
        period_end: "2026-05-01T00:00:00Z",
        hosted_invoice_url: null,
        invoice_pdf: null,
    },
];

const defaultProps = {
    invoices: [],
    isLoading: false,
    error: null,
    onRefresh: vi.fn(),
};

describe("InvoicesView — loading state", () => {
    it("shows loading spinner", () => {
        render(<InvoicesView {...defaultProps} isLoading={true} />);
        expect(screen.getByText("Loading invoices…")).toBeInTheDocument();
    });
});

describe("InvoicesView — error state", () => {
    it("shows error message", () => {
        render(<InvoicesView {...defaultProps} error={new Error("Gateway error")} />);
        expect(screen.getByText("Gateway error")).toBeInTheDocument();
    });
});

describe("InvoicesView — empty state", () => {
    it("shows empty state message", () => {
        render(<InvoicesView {...defaultProps} />);
        expect(screen.getByText("No invoices yet")).toBeInTheDocument();
    });
});

describe("InvoicesView — header", () => {
    it("shows Refresh button", () => {
        render(<InvoicesView {...defaultProps} />);
        expect(screen.getByRole("button", { name: "Refresh invoices" })).toBeInTheDocument();
    });

    it("calls onRefresh when Refresh is clicked", () => {
        const handleRefresh = vi.fn();
        render(<InvoicesView {...defaultProps} onRefresh={handleRefresh} />);
        fireEvent.click(screen.getByRole("button", { name: "Refresh invoices" }));
        expect(handleRefresh).toHaveBeenCalled();
    });

    it("shows total count badge when invoices exist", () => {
        render(<InvoicesView {...defaultProps} invoices={mockInvoices} />);
        expect(screen.getByText("2 total")).toBeInTheDocument();
    });
});

describe("InvoicesView — invoice list", () => {
    it("renders invoice numbers", () => {
        render(<InvoicesView {...defaultProps} invoices={mockInvoices} />);
        expect(screen.getByText("INV-001")).toBeInTheDocument();
        expect(screen.getByText("INV-002")).toBeInTheDocument();
    });

    it("renders status badges", () => {
        render(<InvoicesView {...defaultProps} invoices={mockInvoices} />);
        expect(screen.getByText("paid")).toBeInTheDocument();
        expect(screen.getByText("open")).toBeInTheDocument();
    });

    it("renders PDF link when invoice_pdf is set", () => {
        render(<InvoicesView {...defaultProps} invoices={mockInvoices} />);
        expect(
            screen.getByRole("link", { name: "Download PDF for invoice INV-001" })
        ).toBeInTheDocument();
    });

    it("renders View link when hosted_invoice_url is set", () => {
        render(<InvoicesView {...defaultProps} invoices={mockInvoices} />);
        expect(screen.getByRole("link", { name: "View invoice INV-001" })).toBeInTheDocument();
    });

    it("does not render PDF or View links when URLs are null", () => {
        render(<InvoicesView {...defaultProps} invoices={mockInvoices} />);
        expect(
            screen.queryByRole("link", { name: "Download PDF for invoice INV-002" })
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole("link", { name: "View invoice INV-002" })
        ).not.toBeInTheDocument();
    });
});
