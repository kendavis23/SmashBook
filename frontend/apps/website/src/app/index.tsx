import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { SiteLayout } from "../layout/SiteLayout";

const HomePage = lazy(() =>
    import("../features/home/components/HomePage").then((m) => ({ default: m.HomePage }))
);
const ProductPage = lazy(() =>
    import("../features/product/components/ProductPage").then((m) => ({
        default: m.ProductPage,
    }))
);
const PricingPage = lazy(() =>
    import("../features/pricing/components/PricingPage").then((m) => ({
        default: m.PricingPage,
    }))
);
const AboutPage = lazy(() =>
    import("../features/about/components/AboutPage").then((m) => ({ default: m.AboutPage }))
);
const ContactPage = lazy(() =>
    import("../features/contact/components/ContactPage").then((m) => ({
        default: m.ContactPage,
    }))
);
const PrivacyPage = lazy(() =>
    import("../features/legal/components/PrivacyPage").then((m) => ({
        default: m.PrivacyPage,
    }))
);
const TermsPage = lazy(() =>
    import("../features/legal/components/TermsPage").then((m) => ({ default: m.TermsPage }))
);

function PageLoader() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="w-8 h-8 border-2 border-cta border-t-transparent rounded-full animate-spin" />
        </div>
    );
}

export function AppRouter() {
    return (
        <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
                <Routes>
                    <Route element={<SiteLayout />}>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/product" element={<ProductPage />} />
                        <Route path="/pricing" element={<PricingPage />} />
                        <Route path="/about" element={<AboutPage />} />
                        <Route path="/contact" element={<ContactPage />} />
                        <Route path="/privacy" element={<PrivacyPage />} />
                        <Route path="/terms" element={<TermsPage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
}
