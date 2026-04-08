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
            return <ServiceUnavailable />;
        }
        return this.props.children;
    }
}

function ServiceUnavailable() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
                        Smash<span className="text-blue-600">Book</span>
                    </h1>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-10 py-12">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg
                            className="w-8 h-8 text-blue-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                            />
                        </svg>
                    </div>

                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        We&apos;ll be right back
                    </h2>
                    <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                        SmashBook is currently undergoing maintenance. Our team is on it — please
                        check back in a few minutes.
                    </p>

                    <button
                        onClick={() => window.location.reload()}
                        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                        Try again
                    </button>
                </div>
            </div>
        </div>
    );
}
