import { KeyRound } from "lucide-react";
import { useState } from "react";
import type { JSX } from "react";

import { usePlatformKeyStore } from "../../features/plan/store/platformKey";

const labelCls = "mb-1.5 block text-sm font-medium text-foreground";

export default function PlatformKeySection(): JSX.Element {
    const { platformKey, isSet, set } = usePlatformKeyStore();
    const [input, setInput] = useState("");

    const handleSet = (): void => {
        const trimmed = input.trim();
        if (trimmed) set(trimmed);
    };

    return (
        <section className="card-surface p-5">
            <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                    <KeyRound size={17} />
                </div>
                <div>
                    <h2 className="text-base font-semibold text-foreground">Platform</h2>
                    <p className="text-xs text-muted-foreground">
                        The platform key is sent as the admin API header value.
                    </p>
                </div>
            </div>
            {isSet ? (
                <div className="flex items-center gap-3">
                    <span className="rounded-full border border-border bg-muted/30 px-3 py-1 font-mono text-sm text-muted-foreground">
                        {platformKey.replace(/./g, "•")}
                    </span>
                    <span className="text-xs font-medium text-success">Key set</span>
                </div>
            ) : (
                <div className="flex items-end gap-3">
                    <label className="flex-1">
                        <span className={labelCls}>Platform key</span>
                        <input
                            className="input-base"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="platform-key"
                            autoComplete="off"
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleSet();
                            }}
                        />
                    </label>
                    <button
                        type="button"
                        onClick={handleSet}
                        disabled={!input.trim()}
                        className="btn-cta min-h-10 px-4"
                    >
                        Set
                    </button>
                </div>
            )}
        </section>
    );
}
