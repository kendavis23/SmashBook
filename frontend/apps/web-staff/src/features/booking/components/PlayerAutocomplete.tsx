import type { JSX, KeyboardEvent } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { PlayerSearchResult } from "@repo/staff-domain/models";
import { useSearchPlayers } from "../hooks";

const fieldCls =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground " +
    "placeholder:text-muted-foreground transition focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta-ring/30";

type Props = {
    value: string;
    onChange: (playerId: string) => void;
    clubId?: string | null;
    label: string;
    inputId?: string;
    placeholder?: string;
    error?: boolean;
    disabled?: boolean;
    onSelect?: (player: PlayerSearchResult) => void;
};

function useDebouncedValue(value: string, delayMs: number): string {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = window.setTimeout(() => setDebounced(value), delayMs);
        return () => window.clearTimeout(timer);
    }, [value, delayMs]);

    return debounced;
}

export function PlayerAutocomplete({
    value,
    onChange,
    clubId,
    label,
    inputId,
    placeholder = "Search player name",
    error = false,
    disabled = false,
    onSelect,
}: Props): JSX.Element {
    const generatedInputId = useId();
    const resolvedInputId = inputId ?? generatedInputId;
    const listId = `${resolvedInputId}-listbox`;
    const [inputValue, setInputValue] = useState("");
    const [selectedPlayer, setSelectedPlayer] = useState<PlayerSearchResult | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const closeTimerRef = useRef<number | null>(null);
    const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const trimmedInput = inputValue.trim();
    const debouncedSearch = useDebouncedValue(trimmedInput, 300);
    const canSearch = debouncedSearch.length >= 2;
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
        enabled: canSearch && !disabled,
    });

    useEffect(() => {
        if (!value) {
            setSelectedPlayer(null);
            setInputValue("");
        }
    }, [value]);

    // Reset active index when results change
    useEffect(() => {
        setActiveIndex(-1);
    }, [players]);

    const handleInputChange = (nextValue: string): void => {
        setInputValue(nextValue);
        setIsOpen(true);

        if (!nextValue.trim()) {
            setSelectedPlayer(null);
            onChange("");
            return;
        }

        if (selectedPlayer && nextValue !== selectedPlayer.full_name) {
            setSelectedPlayer(null);
            onChange("");
        }
    };

    const handleSelect = (player: PlayerSearchResult): void => {
        setIsOpen(false);
        setActiveIndex(-1);
        if (onSelect) {
            setSelectedPlayer(null);
            setInputValue("");
            onSelect(player);
            onChange(player.id);
        } else {
            setSelectedPlayer(player);
            setInputValue(player.full_name);
            onChange(player.id);
        }
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
    const showHint = trimmedInput.length > 0 && trimmedInput.length < 2;
    const showResults = canSearch && !isFetching && !isError && players.length > 0;
    const showEmpty = canSearch && !isFetching && !isError && players.length === 0;

    return (
        <div className="relative">
            <input
                id={resolvedInputId}
                type="text"
                role="combobox"
                aria-label={label}
                aria-expanded={showDropdown}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
                className={fieldCls + (error ? " !border-destructive" : "")}
                placeholder={placeholder}
                value={inputValue}
                disabled={disabled}
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
                        <div className="px-3 py-2 text-muted-foreground">Searching players…</div>
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
                                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-foreground transition hover:bg-muted ${i === activeIndex ? "bg-muted" : ""}`}
                                  onClick={() => handleSelect(player)}
                              >
                                  <span>{player.full_name}</span>
                                  {player.skill_level ? (
                                      <span className="text-xs text-muted-foreground">
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
