import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";

const HomePage = lazy(() =>
    import("../features/home/components/HomePage").then((m) => ({ default: m.HomePage }))
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
                    <Route path="/" element={<HomePage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
}
