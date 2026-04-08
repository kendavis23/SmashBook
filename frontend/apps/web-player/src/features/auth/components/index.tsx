// LoginForm, ResetPasswordForm, AuthLayout
// AuthLayout is re-exported by each app's layout/auth/AuthLayout.tsx — never duplicated.
import React from "react";

export function AuthLayout({ children }: { children: React.ReactNode }) {
    return React.createElement(React.Fragment, null, children);
}

// TODO: LoginForm — implement when auth endpoints are ready
// TODO: ResetPasswordForm — implement when auth endpoints are ready
