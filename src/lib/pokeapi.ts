import type { FormattedPokemon, MoveDetail, RawPokemon } from "../types/battle";

// Move lookups are shared across every trainer/pokemon on the page (and across
// games, within a session), so cache them instead of re-fetching on every click.
const moveCache = new Map<string, MoveDetail>();

const moveSlug = (moveName: string) => moveName.toLowerCase().replace(/\s+/g, "-");

async function fetchMove(moveName: string): Promise<MoveDetail> {
    const key = moveSlug(moveName);
    const cached = moveCache.get(key);
    if (cached) return cached;

    const res = await fetch(`https://pokeapi.co/api/v2/move/${key}`);
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
            return moveName ? fetchMove(moveName) : Promise.resolve(undefined);
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
