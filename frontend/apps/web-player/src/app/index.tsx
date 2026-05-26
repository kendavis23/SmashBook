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

const BookingsPage = lazy(() => import("../features/booking/pages/BookingsPage"));
const DashboardPage = lazy(() => import("../features/dashboard/pages/DashboardPage"));
const MyGamesPage = lazy(() => import("../features/my-games/pages/MyGamesPage"));
const ProfilePage = lazy(() => import("../features/profile/pages/ProfilePage"));
const NotificationsPage = lazy(() => import("../features/profile/pages/NotificationsPage"));
const PaymentCardsPage = lazy(() => import("../features/profile/pages/PaymentCardsPage"));
const PaymentWalletPage = lazy(() => import("../features/profile/pages/PaymentWalletPage"));
const MyMembershipPage = lazy(() => import("../features/profile/pages/MyMembershipPage"));
const MembershipPlansPage = lazy(() => import("../features/profile/pages/MembershipPlansPage"));
const LoginPage = lazy(() => import("../features/auth/pages/LoginPage"));
const RegisterPage = lazy(() => import("../features/auth/pages/RegisterPage"));
const LogoutPage = lazy(() => import("../features/auth/pages/LogoutPage"));
const UnauthorizedPage = lazy(() => import("../features/auth/pages/UnauthorizedPage"));
const ForgotPasswordPage = lazy(() => import("../features/auth/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("../features/auth/pages/ResetPasswordPage"));
const VerifyEmailPage = lazy(() => import("../features/auth/pages/VerifyEmailPage"));
const CompleteInvitationPage = lazy(() => import("../features/auth/pages/CompleteInvitationPage"));

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

const registerRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/register",
    validateSearch: (search: Record<string, unknown>) => ({
        clubid: typeof search.clubid === "string" ? search.clubid : undefined,
        t_subdomain: typeof search.t_subdomain === "string" ? search.t_subdomain : undefined,
    }),
    component: RegisterPage,
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

const verifyEmailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/verify-email",
    validateSearch: (search: Record<string, unknown>) => ({
        token: typeof search.token === "string" ? search.token : undefined,
    }),
    component: VerifyEmailPage,
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

const bookingsRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/bookings",
    component: BookingsPage,
});

const myGamesRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/my-games",
    component: MyGamesPage,
});

const profileRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/profile",
    component: ProfilePage,
});

const notificationsRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/profile/notifications",
    component: NotificationsPage,
});

const paymentCardsRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/profile/payments/cards",
    component: PaymentCardsPage,
});

const paymentWalletRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/profile/payments/wallet",
    component: PaymentWalletPage,
});

const myMembershipRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/profile/memberships/current",
    component: MyMembershipPage,
});

const membershipPlansRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/profile/memberships/plans",
    component: MembershipPlansPage,
});

const routeTree = rootRoute.addChildren([
    indexRoute,
    loginRoute,
    registerRoute,
    logoutRoute,
    unauthorizedRoute,
    forgotPasswordRoute,
    resetPasswordRoute,
    verifyEmailRoute,
    completeInvitationRoute,
    dashboardLayoutRoute.addChildren([
        dashboardRoute,
        bookingsRoute,
        myGamesRoute,
        profileRoute,
        notificationsRoute,
        paymentCardsRoute,
        paymentWalletRoute,
        myMembershipRoute,
        membershipPlansRoute,
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
