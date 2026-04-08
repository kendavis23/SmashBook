// Route definitions — lazy-loaded page components only.
// No business logic or API calls here.
import {
    createRootRoute,
    createRoute,
    createRouter,
    Outlet,
    redirect,
    RouterProvider,
} from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { getAccessToken } from "@repo/auth";
import { DashboardLayout } from "../layout/dashboard";

const LoginPage = lazy(() => import("../features/auth/pages/LoginPage"));
const LogoutPage = lazy(() => import("../features/auth/pages/LogoutPage"));
const UnauthorizedPage = lazy(() => import("../features/auth/pages/UnauthorizedPage"));
const ForgotPasswordPage = lazy(() => import("../features/auth/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("../features/auth/pages/ResetPasswordPage"));
const ClubsPage = lazy(() => import("../features/club/pages/ClubsPage"));
const ClubDetailPage = lazy(() => import("../features/club/pages/ClubDetailPage"));

function PageLoader() {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );
}

// Placeholder until dashboard feature is built
function DashboardPage() {
    return <div className="p-8 text-gray-700">Dashboard — coming soon</div>;
}

const rootRoute = createRootRoute({
    component: () => (
        <Suspense fallback={<PageLoader />}>
            <Outlet />
        </Suspense>
    ),
    notFoundComponent: () => (
        <div className="min-h-screen flex items-center justify-center text-gray-500">
            404 — Page Not Found
        </div>
    ),
});

// Root redirect: "/" → "/login"
const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    beforeLoad: () => {
        throw redirect({ to: "/login" });
    },
});

// 🔓 Public Routes
const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/login",
    beforeLoad: () => {
        if (getAccessToken()) {
            throw redirect({ to: "/dashboard" });
        }
    },
    component: LoginPage,
});

const logoutRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/logout",
    component: LogoutPage,
});

const unauthorizedRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/unauthorized",
    component: UnauthorizedPage,
});

const forgotPasswordRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/forgot-password",
    component: ForgotPasswordPage,
});

const resetPasswordRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/reset-password",
    component: ResetPasswordPage,
});

const dashboardLayoutRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: "dashboard-layout",
    component: DashboardLayout,
});

const dashboardRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/dashboard",
    component: DashboardPage,
});

const clubsRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/clubs",
    component: ClubsPage,
});

const clubDetailRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/clubs/$clubId",
    component: ClubDetailPage,
});

const routeTree = rootRoute.addChildren([
    indexRoute,
    loginRoute,
    logoutRoute,
    unauthorizedRoute,
    forgotPasswordRoute,
    resetPasswordRoute,
    dashboardLayoutRoute.addChildren([dashboardRoute, clubsRoute, clubDetailRoute]),
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router;
    }
}

export function AppRouter() {
    return <RouterProvider router={router} />;
}
