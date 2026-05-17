import {
    createRootRoute,
    createRoute,
    createRouter,
    Outlet,
    redirect,
    RouterProvider,
} from "@tanstack/react-router";
import { Suspense } from "react";
import { DashboardLayout } from "../layout/dashboard";
import OnboardPage from "../features/onboard/pages/OnboardPage";
import PlansPage from "../features/plan/pages/PlansPage";
import NewPlanPage from "../features/plan/pages/NewPlanPage";
import EditPlanPage from "../features/plan/pages/EditPlanPage";
import TenantsPage from "../features/tenant/pages/TenantsPage";
import ManageTenantPage from "../features/tenant/pages/ManageTenantPage";
import AdminLoginPage from "../pages/admin-login-page";
import { loadPlatformKey } from "../lib/platform-key-crypto";

function PageLoader() {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );
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

const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/login",
    beforeLoad: () => {
        if (loadPlatformKey() !== null) {
            throw redirect({ to: "/plans" });
        }
    },
    component: AdminLoginPage,
});

const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    beforeLoad: () => {
        throw redirect({ to: "/plans" });
    },
});

const dashboardLayoutRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: "dashboard-layout",
    beforeLoad: () => {
        if (loadPlatformKey() === null) {
            throw redirect({ to: "/login" });
        }
    },
    component: DashboardLayout,
});

const onboardRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/onboard",
    component: OnboardPage,
});

const plansRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/plans",
    component: PlansPage,
});

const newPlanRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/plans/new",
    component: NewPlanPage,
});

const editPlanRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/plans/$planId",
    component: EditPlanPage,
});

const tenantsRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/tenants",
    component: TenantsPage,
});

const manageTenantRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/tenants/$tenantId",
    component: ManageTenantPage,
});

const routeTree = rootRoute.addChildren([
    loginRoute,
    indexRoute,
    dashboardLayoutRoute.addChildren([
        onboardRoute,
        plansRoute,
        newPlanRoute,
        editPlanRoute,
        tenantsRoute,
        manageTenantRoute,
    ]),
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
