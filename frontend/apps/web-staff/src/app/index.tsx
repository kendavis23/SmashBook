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
const NewClubPage = lazy(() => import("../features/club/pages/NewClubPage"));
const ClubDetailPage = lazy(() => import("../features/club/pages/ClubDetailPage"));
const CourtsPage = lazy(() => import("../features/court/pages/CourtsPage"));
const NewCourtPage = lazy(() => import("../features/court/pages/NewCourtPage"));
const EditCourtPage = lazy(() => import("../features/court/pages/EditCourtPage"));
const ReservationsPage = lazy(() => import("../features/reservation/pages/ReservationsPage"));
const NewReservationPage = lazy(() => import("../features/reservation/pages/NewReservationPage"));
const ManageReservationPage = lazy(
    () => import("../features/reservation/pages/ManageReservationPage")
);
const BookingsPage = lazy(() => import("../features/booking/pages/BookingsPage"));
const NewBookingPage = lazy(() => import("../features/booking/pages/NewBookingPage"));
const ManageBookingPage = lazy(() => import("../features/booking/pages/ManageBookingPage"));
const CalendarPage = lazy(() => import("../features/calendar/pages/CalendarPage"));
const MembershipPlansPage = lazy(() => import("../features/membership/pages/MembershipPlansPage"));
const NewMembershipPlanPage = lazy(
    () => import("../features/membership/pages/NewMembershipPlanPage")
);
const EditMembershipPlanPage = lazy(
    () => import("../features/membership/pages/EditMembershipPlanPage")
);

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
    validateSearch: (search: Record<string, unknown>) => ({
        created: search.created === true ? true : undefined,
        updated: search.updated === true ? true : undefined,
    }),
    component: ClubsPage,
});

const newClubRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/clubs/new",
    component: NewClubPage,
});

const clubDetailRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/clubs/$clubId",
    component: ClubDetailPage,
});

const courtsRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/courts",
    validateSearch: (search: Record<string, unknown>) => ({
        created: search.created === true ? true : undefined,
        updated: search.updated === true ? true : undefined,
    }),
    component: CourtsPage,
});

const newCourtRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/courts/new",
    component: NewCourtPage,
});

const editCourtRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/courts/$courtId",
    component: EditCourtPage,
});

const reservationsRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/reservations",
    component: ReservationsPage,
});

const newReservationRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/reservations/new",
    component: NewReservationPage,
});

const manageReservationRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/reservations/$reservationId",
    component: ManageReservationPage,
});

const bookingsRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/bookings",
    component: BookingsPage,
});

const newBookingRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/bookings/new",
    validateSearch: (search: Record<string, unknown>) => ({
        courtId: typeof search.courtId === "string" ? search.courtId : undefined,
        date: typeof search.date === "string" ? search.date : undefined,
        startTime: typeof search.startTime === "string" ? search.startTime : undefined,
    }),
    component: NewBookingPage,
});

const manageBookingRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/bookings/$bookingId",
    component: ManageBookingPage,
});

const calendarRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/calendar",
    component: CalendarPage,
});

const membershipPlansRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/membership-plans",
    validateSearch: (search: Record<string, unknown>) => ({
        created: search.created === true ? true : undefined,
        updated: search.updated === true ? true : undefined,
    }),
    component: MembershipPlansPage,
});

const newMembershipPlanRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/membership-plans/new",
    component: NewMembershipPlanPage,
});

const editMembershipPlanRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/membership-plans/$planId",
    component: EditMembershipPlanPage,
});

const routeTree = rootRoute.addChildren([
    indexRoute,
    loginRoute,
    logoutRoute,
    unauthorizedRoute,
    forgotPasswordRoute,
    resetPasswordRoute,
    dashboardLayoutRoute.addChildren([
        dashboardRoute,
        clubsRoute,
        newClubRoute,
        clubDetailRoute,
        courtsRoute,
        newCourtRoute,
        editCourtRoute,
        reservationsRoute,
        newReservationRoute,
        manageReservationRoute,
        bookingsRoute,
        newBookingRoute,
        manageBookingRoute,
        calendarRoute,
        membershipPlansRoute,
        newMembershipPlanRoute,
        editMembershipPlanRoute,
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
