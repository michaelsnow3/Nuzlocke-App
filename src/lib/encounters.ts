// Per-game nuzlocke encounter tracker, persisted in localStorage. Each entry is one
// area's encounter: the species caught there (or left blank if not yet decided) plus
// nickname/level/status. Namespaced per game so Mogul Platinum and Dreamstone
// Mysteries runs don't collide.

export type EncounterStatus = "alive" | "fainted" | "boxed";

export interface Encounter {
    id: string;
    area: string;
    species: string;
    nickname: string;
    level: string;
    status: EncounterStatus;
}

// Dreamstone Mysteries route/location list. The first 15 are exactly as given by the
// player from their own playthrough notes, including "???" — a genuine in-game area
// name (shown as literal "???" in the game itself, so it won't show up in ROM/doc
// research). Cerampeak and Ceram Base Camp are two more, separate locations found in
// the same neighborhood, cross-checked against the "Battle ID" strings already present
// in boss-teams-full.json (e.g. "route6_kohla", "silversungym_leader",
// "winterlily_hollow_gym_leader") rather than trusted from a single unverified source,
// since earlier ROM-research in this project turned out to contain fabricated data at
// least once. Order past Route 5 is a best-guess based on trainer/story order, not a
// verified map traversal.
const DREAMSTONE_AREAS = [
    "Carabrue Town",
    "Route 1",
    "Route 2",
    "Fennilahl Town",
    "Fennilahl Tunnel",
    "Route 3",
    "Route 3 Underpass",
    "Route 4",
    "Gastree City",
    "Mt. Ceram",
    "Mt. Ceram Interior",
    "???",
    "Cerampeak",
    "Ceram Base Camp",
    "Galecrest City",
    "Route 3 Depths",
    "Route 5",
    "Route 6",
    "Silversun City",
    "Somber HQ",
    "Mirroh Base Camp",
    "Mirrohpeak",
    "Winterlily Hollow",
    "Pelluca City",
    "Sselegant",
    "Rivetshore City",
    "Uncharted Island",
];

const PRESET_AREAS: Record<string, string[]> = {
    "dreamstone-mysteries": DREAMSTONE_AREAS,
};

const storageKeyFor = (gameId: string) => `nuzlocke-encounters:${gameId}`;

function areaRow(area: string): Encounter {
    return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        area,
        species: "",
        nickname: "",
        level: "",
        status: "alive",
    };
}

// Loads the stored encounter list for a game. On a genuinely first-ever visit (nothing
// saved yet) for a game with a known preset area list, seeds and persists one empty row
// per area instead of starting blank. If the preset list has since grown (e.g. a new
// area was added after the player already started their run), any missing areas are
// appended to the stored list too, without touching existing rows.
export function loadEncounters(gameId: string): Encounter[] {
    const preset = PRESET_AREAS[gameId];

    try {
        const raw = localStorage.getItem(storageKeyFor(gameId));
        if (raw) {
            const stored = JSON.parse(raw) as Encounter[];
            if (preset) {
                const existingAreas = new Set(stored.map((e) => e.area));
                const missing = preset.filter((area) => !existingAreas.has(area));
                if (missing.length > 0) {
                    const merged = [...stored, ...missing.map((area) => areaRow(area))];
                    saveEncounters(gameId, merged);
                    return merged;
                }
            }
            return stored;
        }
    } catch {
        // fall through to preset/empty below
    }

    if (preset) {
        const seeded = preset.map((area) => areaRow(area));
        saveEncounters(gameId, seeded);
        return seeded;
    }
    return [];
}

export function saveEncounters(gameId: string, encounters: Encounter[]) {
    try {
        localStorage.setItem(storageKeyFor(gameId), JSON.stringify(encounters));
    } catch {
        // ignore write failures (e.g. private browsing storage limits)
    }
}

export function clearEncounters(gameId: string) {
    try {
        localStorage.removeItem(storageKeyFor(gameId));
    } catch {
        // ignore
    }
}

// "Clear Run": blanks out species/nickname/level/status on every row but keeps the
// rows (and their area names) in place, since areas are now a fixed preset list rather
// than something the user builds up battle-by-battle.
export function resetEncounterPokemon(gameId: string): Encounter[] {
    const current = loadEncounters(gameId);
    const reset = current.map((e) => ({ ...e, species: "", nickname: "", level: "", status: "alive" as EncounterStatus }));
    saveEncounters(gameId, reset);
    return reset;
}

export function newEncounter(): Encounter {
    return areaRow("");
}
