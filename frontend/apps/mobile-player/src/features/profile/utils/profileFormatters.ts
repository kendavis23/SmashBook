export function getInitials(name: string): string {
    return name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

export function getSkillLabel(level: number): string {
    if (level <= 1.5) return "Beginner";
    if (level <= 2.5) return "Novice";
    if (level <= 3.5) return "Intermediate";
    if (level <= 4.5) return "Advanced";
    if (level <= 5.5) return "Expert";
    if (level <= 6.5) return "Elite";
    return "Pro";
}

export function parseSkillLevel(skillLevel: unknown): number | null {
    if (typeof skillLevel === "number") return skillLevel;
    if (skillLevel == null) return null;

    const parsedSkillLevel = Number(skillLevel);
    return Number.isNaN(parsedSkillLevel) ? null : parsedSkillLevel;
}
