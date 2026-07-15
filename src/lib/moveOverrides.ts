import type { MoveSlot, RawPokemon } from "../types/battle";

// User-made move edits are kept in localStorage, namespaced per game, so they persist
// across reloads without touching the underlying source JSON/TS data files.
//
// Shape: { "<trainerKey>__<pokemonIndex>": { "Move 1": "Fire Spin", ... } }
type TrainerOverrides = Partial<Record<MoveSlot, string>>;
type GameOverrides = Record<string, TrainerOverrides>;

const storageKeyFor = (gameId: string) => `nuzlocke-move-overrides:${gameId}`;
const entryKey = (trainerKey: string, pokemonIndex: number) => `${trainerKey}__${pokemonIndex}`;

export function loadOverrides(gameId: string): GameOverrides {
    try {
        const raw = localStorage.getItem(storageKeyFor(gameId));
        return raw ? (JSON.parse(raw) as GameOverrides) : {};
    } catch {
        return {};
    }
}

function saveOverrides(gameId: string, overrides: GameOverrides) {
    try {
        localStorage.setItem(storageKeyFor(gameId), JSON.stringify(overrides));
    } catch {
        // ignore write failures (e.g. private browsing storage limits)
    }
}

// Sets or clears (moveName = null) a single move override, returning the updated
// full override map for the game so callers can update state from the result.
export function setMoveOverride(
    gameId: string,
    trainerKey: string,
    pokemonIndex: number,
    slot: MoveSlot,
    moveName: string | null
): GameOverrides {
    const overrides = loadOverrides(gameId);
    const key = entryKey(trainerKey, pokemonIndex);
    const entry = { ...(overrides[key] || {}) };

    if (moveName) {
        entry[slot] = moveName;
    } else {
        delete entry[slot];
    }

    if (Object.keys(entry).length > 0) {
        overrides[key] = entry;
    } else {
        delete overrides[key];
    }

    saveOverrides(gameId, overrides);
    return overrides;
}

// Applies any stored overrides onto a trainer's pokemon list, returning new objects
// (never mutates the source data) with overridden move names swapped in.
export function applyOverrides(
    overrides: GameOverrides,
    trainerKey: string,
    pokemon: RawPokemon[]
): RawPokemon[] {
    return pokemon.map((p, i) => {
        const entry = overrides[entryKey(trainerKey, i)];
        if (!entry) return p;
        return { ...p, ...entry };
    });
}

export function getOverride(
    overrides: GameOverrides,
    trainerKey: string,
    pokemonIndex: number,
    slot: MoveSlot
): string | undefined {
    return overrides[entryKey(trainerKey, pokemonIndex)]?.[slot];
}
