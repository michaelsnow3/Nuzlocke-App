import { useMemo } from "react";
import BattleBrowser from "../components/BattleBrowser";
import { TrainerPokemonHash } from "../assets/mogul-platinum/TrainerPokemon";
import type { TrainerEntry } from "../types/battle";

export default function MogulPlatinum() {
    const trainers: TrainerEntry[] = useMemo(
        () =>
            Object.keys(TrainerPokemonHash).map((name) => ({
                key: name,
                label: name,
                category: name.toLowerCase().includes("gym") ? "Gym Leader" : "Trainer",
                pokemon: TrainerPokemonHash[name],
            })),
        []
    );

    return (
        <BattleBrowser
            gameTitle="Mogul Platinum"
            trainers={trainers}
            mode="flat"
            highlightCategory="Gym Leader"
            quickJumpLabel={(t) => `Gym ${t.key.split(" ")[1]}`}
        />
    );
}
