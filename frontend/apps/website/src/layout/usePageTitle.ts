import { useEffect } from "react";

const DEFAULT_TITLE = "SmashBook — AI-Powered Padel Club Management";

export function usePageTitle(title?: string) {
    useEffect(() => {
        document.title = title ? `${title} — SmashBook` : DEFAULT_TITLE;
        return () => {
            document.title = DEFAULT_TITLE;
        };
    }, [title]);
}
