import type { JSX } from "react";
import type { HeatmapCell } from "@repo/staff-domain/models";
import {
    HOUR_LABELS,
    DAY_LABELS,
    getCell,
    heatTone,
    heatTextTone,
    activeHours,
} from "../heatmapUtils";

type Props = {
    cells: HeatmapCell[];
    showPct?: boolean;
    showSlots?: boolean;
};

const CELL_W = 86;
const CELL_H = 48;
const LABEL_W = 62; // left column for hour labels
const DAY_H = 32; // top row for day headers
const PAD = 6; // gap between cells

/**
 * SVG heatmap — days across the top, active hours down the left.
 * Only hours that have at least one slot in the API response are shown
 * (so a club that opens at 7am doesn't show 7 empty rows above it).
 */
export function HeatmapGrid({ cells, showPct = false, showSlots = false }: Props): JSX.Element {
    const hours = activeHours(cells);

    if (hours.length === 0) {
        return (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                No slot data to display.
            </div>
        );
    }

    const cols = DAY_LABELS.length; // 7 days
    const rows = hours.length;

    const totalW = LABEL_W + cols * (CELL_W + PAD) - PAD;
    const totalH = DAY_H + rows * (CELL_H + PAD) - PAD;

    return (
        <div className="w-full overflow-hidden">
            <svg
                viewBox={`0 0 ${totalW} ${totalH}`}
                className="h-auto w-full"
                style={{ maxHeight: 480 }}
                aria-label="Utilisation heatmap — days vs hours"
                role="img"
            >
                {/* Day-of-week headers */}
                {DAY_LABELS.map((day, di) => (
                    <text
                        key={day}
                        x={LABEL_W + di * (CELL_W + PAD) + CELL_W / 2}
                        y={DAY_H - 6}
                        textAnchor="middle"
                        fontSize={12}
                        fontWeight={600}
                        className="fill-muted-foreground"
                    >
                        {day}
                    </text>
                ))}

                {/* Rows: one per active hour */}
                {hours.map((hour, ri) => {
                    const y = DAY_H + ri * (CELL_H + PAD);
                    return (
                        <g key={hour}>
                            {/* Hour label */}
                            <text
                                x={LABEL_W - 6}
                                y={y + CELL_H / 2 + 4}
                                textAnchor="end"
                                fontSize={13}
                                fontWeight={500}
                                className="fill-muted-foreground"
                            >
                                {HOUR_LABELS[hour]}
                            </text>

                            {/* Day cells for this hour */}
                            {DAY_LABELS.map((_, di) => {
                                const cell = getCell(cells, di, hour);
                                const pct = cell ? Number(cell.avg_utilisation_pct) : 0;
                                const fill = heatTone(cell ? pct : -1);
                                const textColor = heatTextTone(pct);
                                const x = LABEL_W + di * (CELL_W + PAD);
                                const tooltip = cell
                                    ? `${DAY_LABELS[di]} ${HOUR_LABELS[hour]}: ${pct.toFixed(1)}% (${cell.booked_slots}/${cell.total_slots} slots)`
                                    : `${DAY_LABELS[di]} ${HOUR_LABELS[hour]}: no data`;

                                return (
                                    <g key={di}>
                                        <rect
                                            x={x}
                                            y={y}
                                            width={CELL_W}
                                            height={CELL_H}
                                            rx={4}
                                            fill={fill}
                                        />
                                        {cell && (showPct || showSlots) ? (
                                            <text
                                                x={x + CELL_W / 2}
                                                y={y + CELL_H / 2 + 5}
                                                textAnchor="middle"
                                                fontSize={13}
                                                fontWeight={600}
                                                fill={textColor}
                                            >
                                                {showPct
                                                    ? `${pct.toFixed(0)}%`
                                                    : `${cell.booked_slots}/${cell.total_slots}`}
                                            </text>
                                        ) : null}
                                        <title>{tooltip}</title>
                                    </g>
                                );
                            })}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}
