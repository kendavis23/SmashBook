import type { JSX, KeyboardEvent } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { PlayerSearchResult } from "../../hooks";
import { useSearchPlayers } from "../../hooks";

const fieldCls =
    "w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground " +
    "placeholder:text-muted-foreground transition focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta-ring/30";

type Props = {
    clubId?: string | null;
    selectedPlayer: PlayerSearchResult | null;
    onSelect: (player: PlayerSearchResult) => void;
    onClear: () => void;
};

function useDebouncedValue(value: string, delayMs: number): string {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = window.setTimeout(() => setDebounced(value), delayMs);
        return () => window.clearTimeout(timer);
    }, [value, delayMs]);

    return debounced;
}

export default function PlayerProfileAutocomplete({
    clubId,
    selectedPlayer,
    onSelect,
    onClear,
}: Props): JSX.Element {
    const inputId = useId();
    const listId = `${inputId}-listbox`;
    const [inputValue, setInputValue] = useState(selectedPlayer?.full_name ?? "");
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const closeTimerRef = useRef<number | null>(null);
    const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

    useEffect(() => {
        setInputValue(selectedPlayer?.full_name ?? "");
    }, [selectedPlayer]);

    const trimmedInput = inputValue.trim();
    const debouncedSearch = useDebouncedValue(trimmedInput, 300);
    const canSearch = debouncedSearch.length >= 1;
    const params = useMemo(
        () => ({
            q: debouncedSearch,
            club_id: clubId ?? undefined,
        }),
        [clubId, debouncedSearch]
    );
    const {
        data: players = [],
        isFetching,
        isError,
    } = useSearchPlayers(params, {
        enabled: canSearch && Boolean(clubId),
    });

    useEffect(() => {
        setActiveIndex(-1);
    }, [players]);

    const handleInputChange = (nextValue: string): void => {
        setInputValue(nextValue);
        setIsOpen(true);

        if (!nextValue.trim()) {
            onClear();
            return;
        }

        if (selectedPlayer && nextValue !== selectedPlayer.full_name) {
            onClear();
        }
    };

    const handleSelect = (player: PlayerSearchResult): void => {
        setInputValue(player.full_name);
        setIsOpen(false);
        setActiveIndex(-1);
        onSelect(player);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
        if (!showDropdown || !showResults) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            const next = activeIndex < players.length - 1 ? activeIndex + 1 : 0;
            setActiveIndex(next);
            optionRefs.current[next]?.scrollIntoView({ block: "nearest" });
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            const next = activeIndex > 0 ? activeIndex - 1 : players.length - 1;
            setActiveIndex(next);
            optionRefs.current[next]?.scrollIntoView({ block: "nearest" });
        } else if (e.key === "Enter" && activeIndex >= 0) {
            e.preventDefault();
            const player = players[activeIndex];
            if (player) {
                handleSelect(player);
            }
        } else if (e.key === "Escape") {
            setIsOpen(false);
            setActiveIndex(-1);
        }
    };

    const cancelClose = (): void => {
        if (closeTimerRef.current !== null) {
            window.clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
    };

    const scheduleClose = (): void => {
        closeTimerRef.current = window.setTimeout(() => setIsOpen(false), 150);
    };

    const showDropdown = isOpen && trimmedInput.length > 0;
    const showHint = false;
    const showResults = canSearch && !isFetching && !isError && players.length > 0;
    const showEmpty = canSearch && !isFetching && !isError && players.length === 0;

    return (
        <div className="relative">
            <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground"
            />
            <input
                id={inputId}
                type="text"
                role="combobox"
                aria-label="Player"
                aria-expanded={showDropdown}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
                className={fieldCls}
                placeholder="Search player name"
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => setIsOpen(true)}
                onBlur={scheduleClose}
                onKeyDown={handleKeyDown}
            />

            {showDropdown ? (
                <div
                    id={listId}
                    role="listbox"
                    className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-background py-1 text-sm shadow-lg"
                    onMouseDown={cancelClose}
                >
                    {showHint ? (
                        <div className="px-3 py-2 text-muted-foreground">
                            Type at least 2 characters
                        </div>
                    ) : null}
                    {canSearch && isFetching ? (
                        <div className="px-3 py-2 text-muted-foreground">Searching players...</div>
                    ) : null}
                    {canSearch && isError ? (
                        <div className="px-3 py-2 text-destructive">Failed to load players</div>
                    ) : null}
                    {showEmpty ? (
                        <div className="px-3 py-2 text-muted-foreground">No players found</div>
                    ) : null}
                    {showResults
                        ? players.map((player, i) => (
                              <button
                                  key={player.id}
                                  id={`${listId}-${i}`}
                                  ref={(el) => {
                                      optionRefs.current[i] = el;
                                  }}
                                  type="button"
                                  role="option"
                                  aria-selected={i === activeIndex}
                                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-foreground transition hover:bg-muted ${
                                      i === activeIndex ? "bg-muted" : ""
                                  }`}
                                  onClick={() => handleSelect(player)}
                              >
                                  <span className="min-w-0 truncate">{player.full_name}</span>
                                  {player.skill_level != null ? (
                                      <span className="shrink-0 text-xs text-muted-foreground">
                                          {player.skill_level}
                                      </span>
                                  ) : null}
                              </button>
                          ))
                        : null}
                </div>
            ) : null}
        </div>
    );
}
