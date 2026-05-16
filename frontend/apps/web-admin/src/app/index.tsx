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

function DashboardPage() {
    return <div className="p-8 text-gray-700">Dashboard — coming soon</div>;
}

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

const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    beforeLoad: () => {
        throw redirect({ to: "/dashboard" });
    },
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

const routeTree = rootRoute.addChildren([
    indexRoute,
    dashboardLayoutRoute.addChildren([
        dashboardRoute,
        onboardRoute,
        plansRoute,
        newPlanRoute,
        editPlanRoute,
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
