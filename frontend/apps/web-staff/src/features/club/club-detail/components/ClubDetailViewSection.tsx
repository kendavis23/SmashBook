import { useState } from "react";
import { useGetOperatingHours, useGetPricingRules } from "../../hooks";
import type { Club, OperatingHours, PricingRule } from "../../types";
import type { JSX } from "react";
import ClubDetailView from "./ClubDetailView";

type Props = { club: Club; clubId: string };

export default function ClubDetailViewSection({ club, clubId }: Props): JSX.Element {
    const [rulesPage, setRulesPage] = useState(0);
    const { data: hoursData = [], isLoading: hoursLoading } = useGetOperatingHours(clubId);
    const { data: rulesData = [], isLoading: rulesLoading } = useGetPricingRules(clubId);
    const hours = hoursData as OperatingHours[];
    const rules = rulesData as PricingRule[];

    return (
        <ClubDetailView
            club={club}
            hours={hours}
            rules={rules}
            hoursLoading={hoursLoading}
            rulesLoading={rulesLoading}
            rulesPage={rulesPage}
            onRulesPageChange={setRulesPage}
        />
    );
}
