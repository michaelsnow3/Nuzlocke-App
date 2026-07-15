import type { FormattedPokemon, MoveDetail, RawPokemon } from "../types/battle";

// Move lookups are shared across every trainer/pokemon on the page (and across
// games, within a session), so cache them instead of re-fetching on every click.
const moveCache = new Map<string, MoveDetail>();

const moveSlug = (moveName: string) => moveName.toLowerCase().trim().replace(/\s+/g, "-");

// Resolves a single move name (as typed by a user, or as stored in source data) into
// full move details via PokeAPI. Throws if the name doesn't match a real move.
export async function fetchMove(moveName: string): Promise<MoveDetail> {
    const key = moveSlug(moveName);
    const cached = moveCache.get(key);
    if (cached) return cached;

    const res = await fetch(`https://pokeapi.co/api/v2/move/${key}`);
    if (!res.ok) throw new Error(`Unknown move "${moveName}"`);
    const data = await res.json();
    const detail: MoveDetail = {
        name: moveName,
        power: data.power,
        type: data.type?.name,
        class: data.damage_class?.name || "",
        effect: data.effect_entries?.length
            ? data.effect_entries
                  .find((e: { language: { name: string } }) => e.language.name === "en")
                  ?.short_effect?.replace("$effect_chance", data.effect_chance)
            : "",
    };
    moveCache.set(key, detail);
    return detail;
}

// Resolves a raw pokemon entry's move names into full move details (type, power,
// damage class, effect text) via PokeAPI. Sprite/types/weight/stats are assumed
// to already be present on the raw entry, so no base-pokemon lookup is needed.
export async function formatPokemon(pokemon: RawPokemon): Promise<FormattedPokemon> {
    const slots = ["Move 1", "Move 2", "Move 3", "Move 4"] as const;
    const moves = await Promise.all(
        slots.map((slot) => {
            const moveName = pokemon[slot];
            return moveName ? fetchMove(moveName).catch(() => undefined) : Promise.resolve(undefined);
        })
    );

    return {
        ...pokemon,
        "Move 1": moves[0],
        "Move 2": moves[1],
        "Move 3": moves[2],
        "Move 4": moves[3],
    };
}

// Lightweight species lookup (sprite + types only) used to preview an encounter-tracker
// row once the user types a recognizable species name. Cached separately from moves.
const pokemonBasicCache = new Map<string, { sprite: string; types: string[] } | null>();

export async function fetchPokemonBasic(name: string): Promise<{ sprite: string; types: string[] } | undefined> {
    const key = moveSlug(name);
    if (!key) return undefined;
    if (pokemonBasicCache.has(key)) return pokemonBasicCache.get(key) ?? undefined;

    try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${key}`);
        if (!res.ok) throw new Error("not found");
        const data = await res.json();
        const result = {
            sprite: data.sprites?.front_default as string,
            types: (data.types as { type: { name: string } }[]).map((t) => t.type.name),
        };
        pokemonBasicCache.set(key, result);
        return result;
    } catch {
        pokemonBasicCache.set(key, null);
        return undefined;
    }
}

// Full list of official move names (Title Case, e.g. "Will-O-Wisp"), used to power
// the autocomplete list in the move editor. Fetched once and cached for the session.
let allMoveNamesPromise: Promise<string[]> | undefined;

const toTitleCase = (slug: string) =>
    slug
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

export function fetchAllMoveNames(): Promise<string[]> {
    if (!allMoveNamesPromise) {
        allMoveNamesPromise = fetch("https://pokeapi.co/api/v2/move?limit=2000")
            .then((res) => res.json())
            .then((data: { results: { name: string }[] }) =>
                data.results.map((m) => toTitleCase(m.name)).sort((a, b) => a.localeCompare(b))
            )
            .catch(() => []);
    }
    return allMoveNamesPromise;
}
