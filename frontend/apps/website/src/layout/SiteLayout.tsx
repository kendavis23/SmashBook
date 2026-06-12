import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

function ScrollToTop() {
    const { pathname } = useLocation();
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);
    return null;
}

export function SiteLayout() {
    return (
        <div className="min-h-screen bg-background">
            <ScrollToTop />
            <Navbar />
            <main className="pt-[60px]">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}
