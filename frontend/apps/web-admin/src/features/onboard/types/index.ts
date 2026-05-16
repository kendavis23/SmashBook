import type { SurfaceType } from "@repo/admin-domain/models";

export type {
    SurfaceType,
    TenantOnboardInput,
    TenantOnboardResult,
} from "@repo/admin-domain/models";

interface OnboardSelectOption {
    value: string;
    label: string;
}

export interface OnboardCourtForm {
    name: string;
    surface_type: SurfaceType;
    has_lighting: boolean;
    lighting_surcharge: string;
}

export interface OnboardTenantFormState {
    platformKey: string;
    name: string;
    subdomain: string;
    plan_id: string;
    subscription_start_date: string;
    club: {
        name: string;
        address: string;
        currency: string;
    };
    courts: OnboardCourtForm[];
    owner: {
        email: string;
        full_name: string;
        password: string;
    };
}

export const SURFACE_OPTIONS: OnboardSelectOption[] = [
    { value: "indoor", label: "Indoor" },
    { value: "outdoor", label: "Outdoor" },
    { value: "crystal", label: "Crystal" },
    { value: "artificial_grass", label: "Artificial grass" },
];

export const CURRENCY_OPTIONS: OnboardSelectOption[] = [{ value: "GBP", label: "GBP" }];

export const DEFAULT_COURT: OnboardCourtForm = {
    name: "",
    surface_type: "indoor",
    has_lighting: false,
    lighting_surcharge: "0",
};

export const DEFAULT_ONBOARD_FORM: OnboardTenantFormState = {
    platformKey: "",
    name: "",
    subdomain: "",
    plan_id: "",
    subscription_start_date: "",
    club: {
        name: "",
        address: "",
        currency: "GBP",
    },
    courts: [{ ...DEFAULT_COURT }],
    owner: {
        email: "",
        full_name: "",
        password: "",
    },
};
