import { usePageTitle } from "../../../layout/usePageTitle";

export interface LegalSection {
    heading: string;
    paragraphs: string[];
}

interface LegalPageProps {
    title: string;
    lastUpdated: string;
    intro: string;
    sections: LegalSection[];
}

export function LegalPage({ title, lastUpdated, intro, sections }: LegalPageProps) {
    usePageTitle(title);

    return (
        <div className="py-20 lg:py-24">
            <div className="mx-auto max-w-3xl px-6 lg:px-8">
                <h1 className="text-4xl font-bold text-foreground">{title}</h1>
                <p className="mt-2 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
                <p className="mt-6 text-base leading-7 text-muted-foreground">{intro}</p>

                {sections.map((section) => (
                    <section key={section.heading} className="mt-10">
                        <h2 className="text-xl font-semibold text-foreground">{section.heading}</h2>
                        {section.paragraphs.map((paragraph) => (
                            <p
                                key={paragraph}
                                className="mt-3 text-base leading-7 text-muted-foreground"
                            >
                                {paragraph}
                            </p>
                        ))}
                    </section>
                ))}
            </div>
        </div>
    );
}
