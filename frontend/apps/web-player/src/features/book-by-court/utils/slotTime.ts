/** Converts "HH:MM" (24h) to "h:MM AM/PM" (12h clock). */
export function formatSlotTime(time: string): string {
    const [hStr, mStr] = time.split(":");
    const h = parseInt(hStr ?? "0", 10);
    const m = mStr ?? "00";
    const period = h < 12 ? "AM" : "PM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${m} ${period}`;
}
