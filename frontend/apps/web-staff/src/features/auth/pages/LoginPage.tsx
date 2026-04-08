import type { JSX } from "react";

import LoginForm from "../components/LoginForm";

export default function LoginPage(): JSX.Element {
    return (
        <div className="relative min-h-screen bg-background grid grid-cols-1 lg:grid-cols-[55%_45%]">
            {/* Divider */}
            <div className="hidden lg:block absolute top-0 bottom-0 left-[55%] w-px bg-gradient-to-b from-transparent via-border to-transparent" />

            {/* LEFT */}
            <div className="hidden lg:flex flex-col justify-start pt-10 pl-12">
                {/* Logo */}
                <div className="w-fit mb-10 px-5 py-2.5 rounded-xl border border-border bg-background shadow-xs">
                    <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-foreground">
                        Smash<span className="text-cta">Book</span>
                    </h1>
                </div>

                {/* Image */}
                <div className="flex-1 flex items-center justify-end pr-0">
                    <img
                        src="/padel.png"
                        alt="Padel Illustration"
                        className="max-w-[900px] w-full h-auto object-contain"
                    />
                </div>
            </div>

            {/* RIGHT */}
            <div className="flex items-center justify-center">
                <div className="w-[100%] mx-auto min-h-screen flex flex-col justify-center py-12">
                    <LoginForm />
                </div>
            </div>
        </div>
    );
}
