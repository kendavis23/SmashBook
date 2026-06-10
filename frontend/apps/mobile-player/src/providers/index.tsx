import { useAuth, useInitAuth } from "@repo/auth";
import {
    BrandProvider,
    brandForTenant,
    resolveBrand,
    useBrandSelection,
} from "@repo/branding";
import { config } from "@repo/config";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StripeProvider } from "@stripe/stripe-react-native";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ThemeProvider } from "../theme";

function AuthSessionInitializer({ children }: { children: ReactNode }) {
    useInitAuth();
    return children;
}

// Resolve once at module load. Metro inlines EXPO_PUBLIC_* at bundle time, so this
// picks up whichever brand was active when `expo start` was run. For EAS native builds
// the value comes from ACTIVE_BRAND via app.config.ts extra.brandId (Phase 3/4).
const activeBrand = resolveBrand(process.env.EXPO_PUBLIC_ACTIVE_BRAND);

// Model B (shared app) runtime re-skin (plan §3, §14 Phase 5). When the build is the shared
// `_default` brand, re-skin to the tenant's brand once the player's tenant subdomain is known
// (after login). For a dedicated (Model A) build the active brand is fixed, so this is a no-op
// — the brand never matches a different tenant and the effect leaves it untouched.
//
// This bridge lives in the app, not in `@repo/branding`, so branding never imports auth/tenant
// internals (plan §4 — brand/tenant orthogonality). The app reads the subdomain from `useAuth`
// and maps it to a brand via the pure `brandForTenant` registry lookup.
function BrandTenantBridge({ children }: { children: ReactNode }) {
    const { tenantSubdomain } = useAuth();
    const { activeBrandId, selectBrand } = useBrandSelection();

    useEffect(() => {
        // Only the shared build re-skins from the tenant; a dedicated build keeps its
        // build-embedded brand regardless of which tenant logs in.
        if (activeBrand.deliveryModel !== "shared") return;
        const target = brandForTenant(tenantSubdomain);
        if (target.id !== activeBrandId) {
            selectBrand(target.id);
        }
    }, [tenantSubdomain, activeBrandId, selectBrand]);

    return children;
}

export function AppProviders({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient());

    // Pass resolved brand explicitly so BrandProvider never falls back to process.env
    // ACTIVE_BRAND (which is not available in the RN runtime bundle).
    return (
        <BrandProvider brand={activeBrand}>
            <ThemeProvider>
                <StripeProvider
                    publishableKey={config.stripePublishableKey}
                    urlScheme={activeBrand.native.scheme}
                >
                    <QueryClientProvider client={queryClient}>
                        <AuthSessionInitializer>
                            <BrandTenantBridge>{children}</BrandTenantBridge>
                        </AuthSessionInitializer>
                    </QueryClientProvider>
                </StripeProvider>
            </ThemeProvider>
        </BrandProvider>
    );
}
