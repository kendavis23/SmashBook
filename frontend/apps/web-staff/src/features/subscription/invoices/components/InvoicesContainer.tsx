import type { JSX } from "react";
import { useCallback } from "react";
import { useListInvoices } from "../../hooks";
import InvoicesView from "./InvoicesView";
import type { InvoiceItem } from "../../types";

export default function InvoicesContainer(): JSX.Element {
    const { data = [], isLoading, error, refetch } = useListInvoices();

    const handleRefresh = useCallback((): void => {
        void refetch();
    }, [refetch]);

    return (
        <InvoicesView
            invoices={data as InvoiceItem[]}
            isLoading={isLoading}
            error={error as Error | null}
            onRefresh={handleRefresh}
        />
    );
}
