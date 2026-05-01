import React from "react";

interface State {
    error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    render() {
        if (this.state.error) {
            return (
                <div className="min-h-screen bg-background flex items-center justify-center px-4">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-4">
                            Smash<span className="text-cta">Book</span>
                        </h1>
                        <p className="text-muted-foreground mb-6">Something went wrong. Please refresh the page.</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="btn-cta"
                        >
                            Refresh
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
