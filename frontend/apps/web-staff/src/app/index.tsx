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
import { getAccessToken, getActiveRole } from "@repo/auth";
import { canAccess, type UserRole } from "../config/routeConfig";
import { DashboardLayout } from "../layout/dashboard";

const LoginPage = lazy(() => import("../features/auth/pages/LoginPage"));
const LogoutPage = lazy(() => import("../features/auth/pages/LogoutPage"));
const UnauthorizedPage = lazy(() => import("../features/auth/pages/UnauthorizedPage"));
const ForgotPasswordPage = lazy(() => import("../features/auth/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("../features/auth/pages/ResetPasswordPage"));
const CompleteInvitationPage = lazy(() => import("../features/auth/pages/CompleteInvitationPage"));
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
const TrainersPage = lazy(() => import("../features/trainer/pages/TrainersPage"));
const TrainerDetailPage = lazy(() => import("../features/trainer/pages/TrainerDetailPage"));
const OpenMatchesPage = lazy(() => import("../features/open-match/pages/OpenMatchesPage"));
const ManageOpenMatchPage = lazy(
    () => import("../features/open-match/manage-open-match/pages/ManageOpenMatchPage")
);
const PlayersPage = lazy(() => import("../features/player/pages/PlayersPage"));
const RegisterPlayerPage = lazy(() => import("../features/player/pages/RegisterPlayerPage"));
const EquipmentPage = lazy(() => import("../features/equipment/pages/EquipmentPage"));
const ClubUtilisationPage = lazy(() => import("../features/analytics/pages/ClubUtilisationPage"));
const CourtUtilisationPage = lazy(() => import("../features/analytics/pages/CourtUtilisationPage"));
const ClubUtilisationHeatmapPage = lazy(
    () => import("../features/analytics/pages/ClubUtilisationHeatmapPage")
);
const RevenuePerformancePage = lazy(
    () => import("../features/analytics/pages/RevenuePerformancePage")
);
const ClubsRevenuePage = lazy(() => import("../features/analytics/pages/ClubsRevenuePage"));
const PlayerValuePage = lazy(() => import("../features/analytics/pages/PlayerValuePage"));
const PlayerEngagementPage = lazy(() => import("../features/analytics/pages/PlayerEngagementPage"));
const PlayerSegmentsPage = lazy(() => import("../features/analytics/pages/PlayerSegmentsPage"));
const PlayerActivityPage = lazy(() => import("../features/analytics/pages/PlayerActivityPage"));
const StaffListPage = lazy(() => import("../features/staff/pages/StaffPage"));
const StaffInvitationsPage = lazy(() => import("../features/staff/pages/StaffInvitationsPage"));
const MySubscriptionPage = lazy(() => import("../features/subscription/pages/MySubscriptionPage"));
const InvoicesPage = lazy(() => import("../features/subscription/pages/InvoicesPage"));
const PaymentPage = lazy(() => import("../features/subscription/pages/PaymentPage"));

function requireRole(roles: UserRole[]) {
    return () => {
        const role = getActiveRole();
        if (!canAccess(roles, role ?? undefined)) {
            throw redirect({ to: "/unauthorized" });
        }
    };
}

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

function FinancePage() {
    return <div className="p-8 text-gray-700">Finance — coming soon</div>;
}

function ReportPage() {
    return <div className="p-8 text-gray-700">Report — coming soon</div>;
}

function SupportPage() {
    return <div className="p-8 text-gray-700">Support — coming soon</div>;
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

const completeInvitationRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/complete-invitation",
    validateSearch: (search: Record<string, unknown>) => ({
        token: typeof search.token === "string" ? search.token : undefined,
    }),
    component: CompleteInvitationPage,
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
    beforeLoad: requireRole(["owner", "admin", "ops_lead", "staff", "front_desk", "viewer"]),
    validateSearch: (search: Record<string, unknown>) => ({
        created: search.created === true ? true : undefined,
        updated: search.updated === true ? true : undefined,
    }),
    component: ClubsPage,
});

const newClubRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/clubs/new",
    beforeLoad: requireRole(["owner", "admin", "ops_lead", "staff", "front_desk", "viewer"]),
    component: NewClubPage,
});

const clubDetailRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/clubs/$clubId",
    beforeLoad: requireRole(["owner", "admin", "ops_lead", "staff", "front_desk", "viewer"]),
    component: ClubDetailPage,
});

const courtsRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/courts",
    beforeLoad: requireRole(["owner", "admin", "ops_lead", "staff", "front_desk", "viewer"]),
    validateSearch: (search: Record<string, unknown>) => ({
        created: search.created === true ? true : undefined,
        updated: search.updated === true ? true : undefined,
    }),
    component: CourtsPage,
});

const newCourtRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/courts/new",
    beforeLoad: requireRole(["owner", "admin", "ops_lead", "staff", "front_desk", "viewer"]),
    component: NewCourtPage,
});

const editCourtRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/courts/$courtId",
    beforeLoad: requireRole(["owner", "admin", "ops_lead", "staff", "front_desk", "viewer"]),
    component: EditCourtPage,
});

const reservationsRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/reservations",
    beforeLoad: requireRole(["owner", "admin", "ops_lead", "staff", "front_desk", "viewer"]),
    validateSearch: (search: Record<string, unknown>) => ({
        created: search.created === true ? true : undefined,
        deleted: search.deleted === true ? true : undefined,
        reservationType:
            typeof search.reservationType === "string" ? search.reservationType : undefined,
        courtId: typeof search.courtId === "string" ? search.courtId : undefined,
        fromDt: typeof search.fromDt === "string" ? search.fromDt : undefined,
        toDt: typeof search.toDt === "string" ? search.toDt : undefined,
    }),
    component: ReservationsPage,
});

const newReservationRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/reservations/new",
    beforeLoad: requireRole(["owner", "admin", "ops_lead", "staff", "front_desk", "viewer"]),
    component: NewReservationPage,
});

const manageReservationRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/reservations/$reservationId",
    beforeLoad: requireRole(["owner", "admin", "ops_lead", "staff", "front_desk", "viewer"]),
    validateSearch: (search: Record<string, unknown>) => ({
        reservationType:
            typeof search.reservationType === "string" ? search.reservationType : undefined,
        courtId: typeof search.courtId === "string" ? search.courtId : undefined,
        fromDt: typeof search.fromDt === "string" ? search.fromDt : undefined,
        toDt: typeof search.toDt === "string" ? search.toDt : undefined,
    }),
    component: ManageReservationPage,
});

const bookingsRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/bookings",
    beforeLoad: requireRole(["owner", "admin", "ops_lead", "staff", "front_desk", "viewer"]),
    validateSearch: (search: Record<string, unknown>) => ({
        created: search.created === true ? true : undefined,
        cancelled: search.cancelled === true ? true : undefined,
        dateFrom: typeof search.dateFrom === "string" ? search.dateFrom : undefined,
        dateTo: typeof search.dateTo === "string" ? search.dateTo : undefined,
        bookingType: typeof search.bookingType === "string" ? search.bookingType : undefined,
        bookingStatus: typeof search.bookingStatus === "string" ? search.bookingStatus : undefined,
        courtId: typeof search.courtId === "string" ? search.courtId : undefined,
        playerSearch: typeof search.playerSearch === "string" ? search.playerSearch : undefined,
    }),
    component: BookingsPage,
});

const newBookingRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/bookings/new",
    beforeLoad: requireRole(["owner", "admin", "ops_lead", "staff", "front_desk", "viewer"]),
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
    beforeLoad: requireRole(["owner", "admin", "ops_lead", "staff", "front_desk", "viewer"]),
    validateSearch: (search: Record<string, unknown>) => ({
        dateFrom: typeof search.dateFrom === "string" ? search.dateFrom : undefined,
        dateTo: typeof search.dateTo === "string" ? search.dateTo : undefined,
        bookingType: typeof search.bookingType === "string" ? search.bookingType : undefined,
        bookingStatus: typeof search.bookingStatus === "string" ? search.bookingStatus : undefined,
        courtId: typeof search.courtId === "string" ? search.courtId : undefined,
        playerSearch: typeof search.playerSearch === "string" ? search.playerSearch : undefined,
    }),
    component: ManageBookingPage,
});

const calendarRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/calendar",
    beforeLoad: requireRole(["owner", "admin", "ops_lead", "staff", "front_desk", "viewer"]),
    component: CalendarPage,
});

const membershipPlansRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/membership-plans",
    beforeLoad: requireRole(["owner", "admin"]),
    validateSearch: (search: Record<string, unknown>) => ({
        created: search.created === true ? true : undefined,
        updated: search.updated === true ? true : undefined,
    }),
    component: MembershipPlansPage,
});

const newMembershipPlanRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/membership-plans/new",
    beforeLoad: requireRole(["owner", "admin"]),
    component: NewMembershipPlanPage,
});

const editMembershipPlanRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/membership-plans/$planId",
    beforeLoad: requireRole(["owner", "admin"]),
    component: EditMembershipPlanPage,
});

const clubUtilisationRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/analytics/club-utilisation",
    beforeLoad: requireRole(["owner", "admin"]),
    component: ClubUtilisationPage,
});

const courtUtilisationRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/analytics/court-utilisation",
    beforeLoad: requireRole(["owner", "admin"]),
    component: CourtUtilisationPage,
});

const clubUtilisationHeatmapRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/analytics/club-utilisation-heatmap",
    beforeLoad: requireRole(["owner", "admin"]),
    component: ClubUtilisationHeatmapPage,
});

const revenuePerformanceRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/analytics/revenue-performance",
    beforeLoad: requireRole(["owner", "admin"]),
    component: RevenuePerformancePage,
});

const clubsRevenueRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/analytics/clubs-revenue",
    beforeLoad: requireRole(["owner", "admin"]),
    component: ClubsRevenuePage,
});

const playerValueRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/analytics/player-value",
    beforeLoad: requireRole(["owner", "admin"]),
    component: PlayerValuePage,
});

const playerEngagementRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/analytics/player-engagement",
    beforeLoad: requireRole(["owner", "admin"]),
    component: PlayerEngagementPage,
});

const playerSegmentsRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/analytics/player-segments",
    beforeLoad: requireRole(["owner", "admin"]),
    component: PlayerSegmentsPage,
});

const playerActivityRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/analytics/player-activity",
    beforeLoad: requireRole(["owner", "admin"]),
    component: PlayerActivityPage,
});

const staffRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/staff",
    beforeLoad: requireRole(["owner", "admin"]),
    validateSearch: (search: Record<string, unknown>) => ({
        invited: search.invited === true ? true : undefined,
    }),
    component: StaffListPage,
});

const staffInvitationsRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/staff/invitations",
    beforeLoad: requireRole(["owner", "admin"]),
    component: StaffInvitationsPage,
});

const trainersRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/trainers",
    beforeLoad: requireRole(["owner", "admin", "ops_lead", "viewer", "trainer"]),
    validateSearch: (search: Record<string, unknown>) => ({
        created: search.created === true ? true : undefined,
        updated: search.updated === true ? true : undefined,
    }),
    component: TrainersPage,
});

const trainerDetailRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/trainers/$trainerId",
    beforeLoad: requireRole(["owner", "admin", "ops_lead", "viewer", "trainer"]),
    component: TrainerDetailPage,
});

const openMatchRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/open-match",
    beforeLoad: requireRole(["owner", "admin", "ops_lead", "staff", "front_desk", "viewer"]),
    validateSearch: (search: Record<string, unknown>) => ({
        date: typeof search.date === "string" ? search.date : undefined,
        minSkill: typeof search.minSkill === "string" ? search.minSkill : undefined,
        maxSkill: typeof search.maxSkill === "string" ? search.maxSkill : undefined,
    }),
    component: OpenMatchesPage,
});

const manageOpenMatchRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/open-match/$bookingId",
    beforeLoad: requireRole(["owner", "admin", "ops_lead", "staff", "front_desk", "viewer"]),
    validateSearch: (search: Record<string, unknown>) => ({
        date: typeof search.date === "string" ? search.date : undefined,
        minSkill: typeof search.minSkill === "string" ? search.minSkill : undefined,
        maxSkill: typeof search.maxSkill === "string" ? search.maxSkill : undefined,
    }),
    component: ManageOpenMatchPage,
});

const playersRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/players",
    beforeLoad: requireRole(["owner", "admin", "ops_lead", "staff", "front_desk", "viewer"]),
    validateSearch: (search: Record<string, unknown>) => ({
        registered: search.registered === true ? true : undefined,
    }),
    component: PlayersPage,
});

const registerPlayerRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/players/new",
    beforeLoad: requireRole(["owner", "admin", "ops_lead", "staff", "front_desk"]),
    component: RegisterPlayerPage,
});

const subscriptionRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/subscription",
    beforeLoad: requireRole(["owner"]),
    component: MySubscriptionPage,
});

const invoicesRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/invoices",
    beforeLoad: requireRole(["owner"]),
    component: InvoicesPage,
});

const paymentRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/subscription/payment",
    beforeLoad: requireRole(["owner"]),
    component: PaymentPage,
});

const financeRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/finance",
    beforeLoad: requireRole(["owner"]),
    component: FinancePage,
});

const reportsRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/reports",
    beforeLoad: requireRole(["owner", "admin"]),
    component: ReportPage,
});

const supportRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/support",
    beforeLoad: requireRole(["owner", "admin", "ops_lead", "staff", "front_desk", "viewer"]),
    component: SupportPage,
});

const equipmentRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/equipment",
    beforeLoad: requireRole(["owner", "admin", "ops_lead", "staff", "front_desk", "viewer"]),
    component: EquipmentPage,
});

const routeTree = rootRoute.addChildren([
    indexRoute,
    loginRoute,
    logoutRoute,
    unauthorizedRoute,
    forgotPasswordRoute,
    resetPasswordRoute,
    completeInvitationRoute,
    dashboardLayoutRoute.addChildren([
        dashboardRoute,
        clubUtilisationRoute,
        courtUtilisationRoute,
        clubUtilisationHeatmapRoute,
        revenuePerformanceRoute,
        clubsRevenueRoute,
        playerValueRoute,
        playerEngagementRoute,
        playerSegmentsRoute,
        playerActivityRoute,
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
        staffRoute,
        staffInvitationsRoute,
        trainersRoute,
        trainerDetailRoute,
        openMatchRoute,
        manageOpenMatchRoute,
        playersRoute,
        registerPlayerRoute,
        subscriptionRoute,
        paymentRoute,
        invoicesRoute,
        financeRoute,
        reportsRoute,
        supportRoute,
        equipmentRoute,
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
