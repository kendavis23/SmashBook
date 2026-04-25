import { useCallback, useState } from "react";
import type { JSX } from "react";
import { useMyBookings } from "../../hooks";
import type { BookingTab } from "../../types";
import BookingsView from "./BookingsView";

export default function BookingsContainer(): JSX.Element {
    const { data, isLoading, error, refetch } = useMyBookings();
    const [activeTab, setActiveTab] = useState<BookingTab>("upcoming");

    const handleRefresh = useCallback(() => void refetch(), [refetch]);
    const handleTabChange = useCallback((tab: BookingTab) => setActiveTab(tab), []);

    return (
        <BookingsView
            upcoming={data?.upcoming ?? []}
            past={data?.past ?? []}
            activeTab={activeTab}
            isLoading={isLoading}
            error={error}
            onTabChange={handleTabChange}
            onRefresh={handleRefresh}
        />
    );
}
