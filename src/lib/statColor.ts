// Maps a base stat value to a red -> amber -> green color and a bar fill percentage,
// mirroring the stat-bar treatment used by nuzlocke-redux.

const STAT_MAX = 180;

export function statColor(value: number): string {
    const ratio = Math.max(0, Math.min(1, value / STAT_MAX));
    const hue = ratio * 120; // 0 = red, 120 = green
    return `hsl(${hue}, 70%, 50%)`;
}

export function statBarWidth(value: number): string {
    const ratio = Math.max(0, Math.min(1, value / STAT_MAX));
    return `${Math.max(6, ratio * 100)}%`;
}

const STAT_ABBREVIATIONS: Record<string, string> = {
    hp: "hp",
    attack: "atk",
    defense: "def",
    "special-attack": "spa",
    "special-defense": "spd",
    speed: "spe",
};

export function statAbbreviation(name: string): string {
    return STAT_ABBREVIATIONS[name] || name;
}
