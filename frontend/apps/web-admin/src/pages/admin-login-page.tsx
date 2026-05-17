import { type FormEvent, useState } from "react";
import type { JSX } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AlertToast } from "@repo/ui";
import { listPlansEndpoint } from "@repo/api-client/modules/admin";
import { useAdminAuthStore } from "../store/admin-auth-store";

export default function AdminLoginPage(): JSX.Element {
    const [key, setKey] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const setPlatformKey = useAdminAuthStore((s) => s.setPlatformKey);
    const navigate = useNavigate();

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!key.trim()) return;

        setIsLoading(true);
        setError(null);

        try {
            await listPlansEndpoint(key.trim());
            setPlatformKey(key.trim());
            void navigate({ to: "/plans" });
        } catch {
            setError("Invalid platform key. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 overflow-auto bg-background grid grid-cols-1 lg:grid-cols-[55%_45%]">
            {/* Divider */}
            <div className="hidden lg:block absolute top-0 bottom-0 left-[55%] w-px bg-gradient-to-b from-transparent via-border to-transparent" />

            {/* LEFT */}
            <div className="hidden lg:flex flex-col justify-start pt-10 pl-12 h-full overflow-hidden">
                {/* Logo */}
                <div className="w-fit mb-10 px-5 py-2.5 rounded-xl border border-border bg-background shadow-xs">
                    <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-foreground">
                        Smash<span className="text-cta">Book</span>
                        <span className="ml-2 text-sm font-medium text-muted-foreground">
                            Admin
                        </span>
                    </h1>
                </div>

                {/* Image */}
                <div className="flex-1 flex items-center justify-end pr-0">
                    <img
                        src="/image.png"
                        alt="Admin Illustration"
                        className="max-w-[900px] w-full h-auto object-contain"
                    />
                </div>
            </div>

            {/* RIGHT */}
            <div className="flex items-center justify-center h-full lg:h-auto">
                <div className="w-full max-w-sm mx-auto px-6 py-12">
                    {/* Mobile logo */}
                    <div className="mb-8 text-center lg:hidden">
                        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground text-lg font-bold">
                            SB
                        </div>
                        <h1 className="text-xl font-semibold text-foreground">SmashBook Admin</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Internal platform portal
                        </p>
                    </div>

                    <div className="mb-6 hidden lg:block">
                        <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Sign in to the internal platform portal
                        </p>
                    </div>

                    <div className="card-surface p-6">
                        <h3 className="mb-5 text-sm font-semibold text-foreground">
                            Platform Authentication
                        </h3>

                        {error ? (
                            <div className="mb-4">
                                <AlertToast
                                    title={error}
                                    variant="error"
                                    onClose={() => setError(null)}
                                />
                            </div>
                        ) : null}

                        <form onSubmit={(e) => void handleSubmit(e)} noValidate>
                            <div className="space-y-4">
                                <label className="block">
                                    <span className="mb-1.5 block text-sm font-medium text-foreground">
                                        X-Platform-Key
                                    </span>
                                    <input
                                        type="password"
                                        value={key}
                                        onChange={(e) => setKey(e.target.value)}
                                        placeholder="Enter platform key"
                                        disabled={isLoading}
                                        autoComplete="off"
                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm
                                            text-foreground placeholder:text-muted-foreground
                                            focus:outline-none focus:ring-2 focus:ring-primary/50
                                            disabled:opacity-50"
                                    />
                                </label>

                                <button
                                    type="submit"
                                    disabled={isLoading || !key.trim()}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg
                                        bg-cta px-4 py-2.5 text-sm font-medium text-cta-foreground
                                        transition-opacity hover:opacity-90
                                        disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <>
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                                            Verifying…
                                        </>
                                    ) : (
                                        "Access Admin Portal"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
