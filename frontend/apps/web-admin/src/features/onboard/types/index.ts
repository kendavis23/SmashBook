export type { TenantOnboardInput, TenantOnboardResult } from "@repo/admin-domain/models";

interface OnboardSelectOption {
    value: string;
    label: string;
}

export interface OnboardClubForm {
    name: string;
    address: string;
    currency: string;
}

export interface OnboardTenantFormState {
    name: string;
    trading_name: string;
    player_subdomain: string;
    staff_subdomain: string;
    plan_id: string;
    subscription_start_date: string;
    clubs: OnboardClubForm[];
    owner: {
        email: string;
        full_name: string;
        password: string;
    };
}

export const CURRENCY_OPTIONS: OnboardSelectOption[] = [{ value: "GBP", label: "GBP" }];

export const DEFAULT_CLUB: OnboardClubForm = {
    name: "",
    address: "",
    currency: "GBP",
};

export const DEFAULT_ONBOARD_FORM: OnboardTenantFormState = {
    name: "",
    trading_name: "",
    player_subdomain: "",
    staff_subdomain: "",
    plan_id: "",
    subscription_start_date: "",
    clubs: [{ ...DEFAULT_CLUB }],
    owner: {
        email: "",
        full_name: "",
        password: "",
    },
};
