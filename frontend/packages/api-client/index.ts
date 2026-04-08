// Public API surface for @repo/api-client.
//
// Exports:
//   - HTTP endpoint functions (consumed by domain hooks only)
//   - ApiError / ApiErrorCode (consumed by domain hooks and feature error handlers)
//   - fetcher + createQueryClient (infrastructure helpers)
//
// DTO types (*.types.ts) are INTERNAL to this package.
// Domain packages map DTOs → domain models. Apps import domain models only.

// Core
export { fetcher } from "./core/fetcher";
export { createQueryClient } from "./core/client";
export type { ApiError, ApiErrorCode } from "./core/error";

// Club endpoints
export {
    listClubsEndpoint,
    createClubEndpoint,
    getClubEndpoint,
    updateClubEndpoint,
    updateClubSettingsEndpoint,
    getOperatingHoursEndpoint,
    setOperatingHoursEndpoint,
    getPricingRulesEndpoint,
    setPricingRulesEndpoint,
    stripeConnectEndpoint,
} from "./modules/staff";

// Profile endpoints
export { updateProfileEndpoint } from "./modules/share/profile/profile.api";
