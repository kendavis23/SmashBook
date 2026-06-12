import { Hero } from "./Hero";
import { Features } from "./Features";
import { ProductSplit } from "./ProductSplit";
import { About } from "./About";
import { CtaSection } from "./CtaSection";

export function HomePage() {
    return (
        <>
            <Hero />
            <Features />
            <ProductSplit />
            <About />
            <CtaSection />
        </>
    );
}
