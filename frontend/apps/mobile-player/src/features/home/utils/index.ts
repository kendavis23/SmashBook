export function formatPlainTime(time: string): string {
    const [hourStr, minuteStr] = time.split(":");
    const hour = parseInt(hourStr ?? "0", 10);
    const minute = minuteStr ?? "00";
    const suffix = hour >= 12 ? "PM" : "AM";
    const h = hour % 12 === 0 ? 12 : hour % 12;
    return `${h}:${minute} ${suffix}`;
}
