import { useMemo } from "react";
import BattleBrowser from "../components/BattleBrowser";
import type { RawPokemon, TrainerEntry } from "../types/battle";
import bossTeamsData from "../assets/dreamstone-mysteries/boss-teams-full.json";

interface RawTrainer {
    Trainer: string;
    "Battle Type": string;
    "Battle ID": string;
    Pokemon: RawPokemon[];
}

interface BossTeamsFile {
    Game: string;
    Version: string;
    Difficulty: string;
    Trainers: { [trainerName: string]: RawTrainer };
}

const bossTeams = bossTeamsData as unknown as BossTeamsFile;

const CATEGORY_ORDER = ["Gym Leader", "Rival", "Admin", "Boss", "Elite Four", "Champion"];

export default function DreamstoneMysteries() {
    const trainers: TrainerEntry[] = useMemo(
        () =>
            Object.entries(bossTeams.Trainers).map(([name, trainer]) => ({
                key: name,
                label: name,
                category: trainer["Battle Type"] || "Other",
                pokemon: trainer.Pokemon,
            })),
        []
    );

    return (
        <BattleBrowser
            gameTitle={`${bossTeams.Game} — ${bossTeams.Version}`}
            trainers={trainers}
            mode="sequence"
            categoryOrder={CATEGORY_ORDER}
        />
    );
}
