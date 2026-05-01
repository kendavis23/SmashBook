import { Navbar } from "./Navbar";
import { Hero } from "./Hero";
import { Features } from "./Features";
import { About } from "./About";
import { Footer } from "./Footer";

export function HomePage() {
    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="pt-16">
                <Hero />
                <Features />
                <About />
            </main>
            <Footer />
        </div>
    );
}
