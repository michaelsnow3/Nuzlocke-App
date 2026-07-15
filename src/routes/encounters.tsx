import { useEffect, useState } from "react";
import NavTabs from "../components/NavTabs";
import {
    loadEncounters,
    newEncounter,
    resetEncounterPokemon,
    saveEncounters,
    type Encounter,
    type EncounterStatus,
} from "../lib/encounters";
import { fetchPokemonBasic } from "../lib/pokeapi";
import { getLastGame, setLastGame } from "../lib/lastGame";

const GAMES = [
    { id: "mogul-platinum", label: "Mogul Platinum" },
    { id: "dreamstone-mysteries", label: "Dreamstone Mysteries" },
];

const STATUS_OPTIONS: { value: EncounterStatus; label: string }[] = [
    { value: "alive", label: "Alive" },
    { value: "fainted", label: "Fainted" },
    { value: "boxed", label: "Boxed" },
];

function EncounterSprite({ species }: { species: string }) {
    const [sprite, setSprite] = useState<string>();

    useEffect(() => {
        let cancelled = false;
        setSprite(undefined);
        const name = species.trim();
        if (!name) return;
        fetchPokemonBasic(name).then((res) => {
            if (!cancelled) setSprite(res?.sprite);
        });
        return () => {
            cancelled = true;
        };
    }, [species]);

    if (!sprite) return <div className="encounter-sprite encounter-sprite-empty" />;
    return <img src={sprite} className="encounter-sprite" alt="" />;
}

const initialGameId = () => getLastGame() ?? GAMES[0].id;

export default function Encounters() {
    const [gameId, setGameId] = useState(initialGameId);
    const [encounters, setEncounters] = useState<Encounter[]>(() => loadEncounters(initialGameId()));

    useEffect(() => {
        setEncounters(loadEncounters(gameId));
        setLastGame(gameId);
    }, [gameId]);

    const update = (next: Encounter[]) => {
        setEncounters(next);
        saveEncounters(gameId, next);
    };

    const updateRow = (id: string, patch: Partial<Encounter>) => {
        update(encounters.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    };

    const addRow = () => update([...encounters, newEncounter()]);

    const removeRow = (id: string) => update(encounters.filter((e) => e.id !== id));

    const handleClear = () => {
        const game = GAMES.find((g) => g.id === gameId);
        if (caughtCount === 0) return;
        const confirmed = window.confirm(
            `Clear all caught Pokémon for ${game?.label}? Areas stay in place — only species/nickname/level/status get reset. This can't be undone.`
        );
        if (!confirmed) return;
        setEncounters(resetEncounterPokemon(gameId));
    };

    const caughtCount = encounters.filter((e) => e.species.trim()).length;
    const aliveCount = encounters.filter((e) => e.status === "alive" && e.species.trim()).length;
    const faintedCount = encounters.filter((e) => e.status === "fainted").length;

    return (
        <div className="page-container">
            <NavTabs />

            <div className="encounters-header">
                <h1 className="game-heading">Encounter Tracker</h1>
                <div className="game-tabs">
                    {GAMES.map((g) => (
                        <div
                            className={`game-tab${gameId === g.id ? " active" : ""}`}
                            onClick={() => setGameId(g.id)}
                            key={g.id}
                        >
                            {g.label}
                        </div>
                    ))}
                </div>
            </div>

            <div className="encounters-summary">
                <span>{caughtCount} caught</span>
                <span>{aliveCount} alive</span>
                <span>{faintedCount} fainted</span>
            </div>

            <div className="encounters-table">
                <div className="encounters-row encounters-row-header">
                    <div />
                    <div>Area</div>
                    <div>Species</div>
                    <div>Nickname</div>
                    <div>Level</div>
                    <div>Status</div>
                    <div />
                </div>
                {encounters.length === 0 ? (
                    <div className="encounters-empty">No encounters logged yet for {GAMES.find((g) => g.id === gameId)?.label}.</div>
                ) : (
                    encounters.map((e) => (
                        <div className="encounters-row" key={e.id}>
                            <EncounterSprite species={e.species} />
                            <input
                                className="encounter-input"
                                placeholder="Area (e.g. Route 3)"
                                value={e.area}
                                onChange={(ev) => updateRow(e.id, { area: ev.target.value })}
                            />
                            <input
                                className="encounter-input"
                                placeholder="Species"
                                value={e.species}
                                onChange={(ev) => updateRow(e.id, { species: ev.target.value })}
                            />
                            <input
                                className="encounter-input"
                                placeholder="Nickname"
                                value={e.nickname}
                                onChange={(ev) => updateRow(e.id, { nickname: ev.target.value })}
                            />
                            <input
                                className="encounter-input encounter-input-level"
                                placeholder="Lv"
                                value={e.level}
                                onChange={(ev) => updateRow(e.id, { level: ev.target.value })}
                            />
                            <select
                                className={`encounter-status encounter-status-${e.status}`}
                                value={e.status}
                                onChange={(ev) => updateRow(e.id, { status: ev.target.value as EncounterStatus })}
                            >
                                {STATUS_OPTIONS.map((s) => (
                                    <option value={s.value} key={s.value}>
                                        {s.label}
                                    </option>
                                ))}
                            </select>
                            <span className="encounter-remove" onClick={() => removeRow(e.id)} title="Remove row">
                                ✕
                            </span>
                        </div>
                    ))
                )}
            </div>

            <div className="encounters-actions">
                <div className="button" onClick={addRow}>
                    + Add Encounter
                </div>
                <div className="button button-danger" onClick={handleClear}>
                    Clear Run
                </div>
            </div>
        </div>
    );
}
