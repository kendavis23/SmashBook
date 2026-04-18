export type UUID = string;

export type TenantUserRole =
    | "owner"
    | "admin"
    | "ops_lead"
    | "staff"
    | "front_desk"
    | "trainer"
    | "viewer"
    | "player";

export type NotificationChannel = "email" | "sms" | "push" | "in_app";

// --- API request / response contracts ---

export interface UserRegister {
    tenant_subdomain: string;
    email: string;
    full_name: string;
    password: string;
}

export interface UserLogin {
    tenant_subdomain: string;
    email: string;
    password: string;
}

export interface ClubSummary {
    club_id: UUID;
    club_name: string;
    role: string;
}

export interface TokenResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    clubs: ClubSummary[];
}

export interface RefreshRequest {
    refresh_token: string;
}

export interface PasswordResetRequest {
    tenant_subdomain: string;
    email: string;
}

export interface PasswordResetConfirm {
    token: string;
    new_password: string;
}

export interface UserResponse {
    id: UUID;
    email: string;
    full_name: string;
    role: TenantUserRole;
    phone: string | null;
    photo_url: string | null;
    skill_level: number | null;
    preferred_notification_channel: NotificationChannel;
    is_active: boolean;
}

// --- Internal store types ---

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface AuthState {
    user: UserResponse | null;
    tokens: AuthTokens | null;
    tenantSubdomain: string | null;
    clubs: ClubSummary[];
    isAuthenticated: boolean;
}
