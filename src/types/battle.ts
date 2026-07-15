// Shared types for trainer/pokemon battle data across games.

export interface MoveDetail {
    name: string;
    type: string;
    power: number;
    class: string;
    effect?: string;
}

// A single pokemon entry as it appears in a game's source JSON/TS data.
export interface RawPokemon {
    "Context/Notes"?: string;
    Trainer?: string;
    "Battle Type"?: string;
    "Battle ID"?: string;
    "Dex Number"?: number;
    "Pokémon": string;
    Level: number;
    Item?: string | null;
    Nature: string;
    Ability: string;
    "Move 1"?: string | null;
    "Move 2"?: string | null;
    "Move 3"?: string | null;
    "Move 4"?: string | null;
    sprite: string;
    types: string[];
    weight: number;
    stats: {
        name: string;
        value: number;
    }[];
    "Row Notes"?: undefined;
    /** True when the moves above weren't custom-set by the trainer in source data and were
     *  instead computed from the species' level-up learnset (i.e. the in-game default moveset). */
    "Default Moveset"?: boolean;
}

// A pokemon entry once move details have been resolved via PokeAPI.
export type FormattedPokemon = Omit<RawPokemon, "Move 1" | "Move 2" | "Move 3" | "Move 4"> & {
    "Move 1"?: MoveDetail;
    "Move 2"?: MoveDetail;
    "Move 3"?: MoveDetail;
    "Move 4"?: MoveDetail;
};

export type MoveSlot = "Move 1" | "Move 2" | "Move 3" | "Move 4";

// A trainer battle, normalized to a common shape regardless of source game.
export interface TrainerEntry {
    key: string;
    label: string;
    category?: string;
    pokemon: RawPokemon[];
}

export interface ActiveTrainer {
    key: string;
    label: string;
    idx: number;
    pokemon: FormattedPokemon[];
}
