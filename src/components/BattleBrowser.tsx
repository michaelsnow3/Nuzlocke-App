import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Tooltip, Whisper } from "rsuite";
import type { ActiveTrainer, FormattedPokemon, MoveDetail, MoveSlot, RawPokemon, TrainerEntry } from "../types/battle";
import { fetchAllMoveNames, fetchMove, formatPokemon } from "../lib/pokeapi";
import { applyOverrides, getOverride, loadOverrides, setMoveOverride } from "../lib/moveOverrides";
import { setLastGame } from "../lib/lastGame";
import { DamageClassIcon, PowerIcon } from "./MoveIcon";
import { statAbbreviation, statBarWidth, statColor } from "../lib/statColor";
import NavTabs from "./NavTabs";

const MOVE_OPTIONS_ID = "move-name-options";

// Bundles the move-editing state and handlers that ActivePokemonCard/ActiveMove need,
// so BattleBrowser doesn't have to thread a dozen individual props down two levels.
interface MoveEditState {
    editing?: { pokemonIdx: number; slot: MoveSlot };
    value: string;
    error?: string;
    saving: boolean;
    isOverridden: (pokemonIdx: number, slot: MoveSlot) => boolean;
    onStart: (pokemonIdx: number, slot: MoveSlot, currentName: string) => void;
    onCancel: () => void;
    onChangeValue: (value: string) => void;
    onSave: () => void;
    onReset: (pokemonIdx: number, slot: MoveSlot) => void;
}

export interface BattleBrowserProps {
    gameTitle: string;
    trainers: TrainerEntry[];
    /** Namespaces move-edit overrides in localStorage so games don't collide with each other. */
    storageKey: string;
    /**
     * "flat": a single scrollable trainer list with a quick-jump bar for one
     *   highlighted category (mirrors the original Mogul Platinum gym-leader jump bar).
     * "grouped": trainers are grouped into sections by category, with a
     *   quick-jump bar of one chip per category and a search box. Suited to
     *   large trainer counts.
     * "sequence": trainers are shown in the exact order given (approximating the order
     *   they're fought in-game), with a search box and toggleable category filter chips
     *   instead of grouping/jumping. Each card shows its category as a small tag.
     */
    mode: "flat" | "grouped" | "sequence";
    /** Flat mode only: category value whose trainers appear in the quick-jump bar. */
    highlightCategory?: string;
    /** Flat mode only: formats the quick-jump chip label for a highlighted trainer. */
    quickJumpLabel?: (trainer: TrainerEntry) => string;
    /** Grouped mode only: explicit ordering for category sections. */
    categoryOrder?: string[];
}

function TypePill({ type, small }: { type: string; small?: boolean }) {
    return <span className={`type-pill ${type.toLocaleLowerCase()}${small ? " type-pill-small" : ""}`}>{type}</span>;
}

function StatBars({ stats }: { stats: { name: string; value: number }[] }) {
    return (
        <div className="poke-stats">
            {stats.map((s) => (
                <div className="poke-stat-row" key={s.name}>
                    <span className="poke-stat-label">{statAbbreviation(s.name)}</span>
                    <span className="poke-stat-value" style={{ color: statColor(s.value) }}>
                        {s.value}
                    </span>
                    <div className="poke-stat-bar">
                        <div
                            className="poke-stat-bar-fill"
                            style={{ width: statBarWidth(s.value), backgroundColor: statColor(s.value) }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

function CardHeader({ pokemon }: { pokemon: RawPokemon | FormattedPokemon }) {
    return (
        <div className={`poke-card-header header-${pokemon.types[0]?.toLocaleLowerCase()}`}>
            <div className="poke-card-types">
                {pokemon.types.map((t) => (
                    <TypePill type={t} key={t} />
                ))}
            </div>
            <div className="poke-card-title-row">
                <div className="poke-card-level">
                    <div className="poke-card-level-label">Level</div>
                    <div className="poke-card-level-value">{pokemon.Level}</div>
                </div>
                <div className="poke-card-name-ability">
                    <div className="poke-card-ability">
                        {pokemon.Ability}
                        {pokemon.Item ? <span className="poke-card-item"> • {pokemon.Item}</span> : null}
                    </div>
                    <div className="poke-card-name">{pokemon["Pokémon"]}</div>
                </div>
            </div>
            <img src={pokemon.sprite} className="poke-card-sprite" alt="" />
            <div className="poke-card-weight">{pokemon.weight}</div>
        </div>
    );
}

function PokemonListCard({ pokemon }: { pokemon: RawPokemon }) {
    return (
        <div className="poke-card">
            <CardHeader pokemon={pokemon} />
            <div className="poke-card-body">
                <div className="poke-card-moves poke-card-moves-plain">
                    {([1, 2, 3, 4] as const).map((n) => {
                        const move = pokemon[`Move ${n}` as "Move 1"];
                        if (!move) return null;
                        return (
                            <div className="poke-card-move-plain" key={n}>
                                {move}
                            </div>
                        );
                    })}
                </div>
                {pokemon["Default Moveset"] ? <div className="default-moveset-tag">default moveset</div> : null}
            </div>
        </div>
    );
}

function ActiveMove({
    move,
    slot,
    pokemonIdx,
    editState,
}: {
    move?: MoveDetail;
    slot: MoveSlot;
    pokemonIdx: number;
    editState: MoveEditState;
}) {
    const isEditing = editState.editing?.pokemonIdx === pokemonIdx && editState.editing?.slot === slot;

    if (isEditing) {
        return (
            <div className="poke-card-move poke-card-move-editing">
                <input
                    className="move-edit-input"
                    list={MOVE_OPTIONS_ID}
                    value={editState.value}
                    autoFocus
                    onChange={(e) => editState.onChangeValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") editState.onSave();
                        if (e.key === "Escape") editState.onCancel();
                    }}
                />
                <div className="move-edit-actions">
                    <span
                        className="move-edit-btn move-edit-save"
                        onClick={() => !editState.saving && editState.onSave()}
                    >
                        {editState.saving ? "…" : "✓"}
                    </span>
                    <span className="move-edit-btn move-edit-cancel" onClick={() => editState.onCancel()}>
                        ✕
                    </span>
                </div>
                {editState.error ? <div className="move-edit-error">{editState.error}</div> : null}
            </div>
        );
    }

    if (!move) {
        return (
            <div className="poke-card-move poke-card-move-empty">
                <span className="move-edit-pencil" onClick={() => editState.onStart(pokemonIdx, slot, "")}>
                    + add move
                </span>
            </div>
        );
    }

    return (
        <div className="poke-card-move">
            <div className="poke-card-move-top">
                <Whisper trigger="click" placement="bottomStart" speaker={<Tooltip>{move.effect}</Tooltip>}>
                    <span className="move-name">{move.name}</span>
                </Whisper>
                {move.power ? (
                    <span className="move-power">
                        <PowerIcon />
                        {move.power}
                    </span>
                ) : null}
                <span
                    className="move-edit-pencil"
                    title="Edit move"
                    onClick={() => editState.onStart(pokemonIdx, slot, move.name)}
                >
                    ✎
                </span>
                {editState.isOverridden(pokemonIdx, slot) ? (
                    <span
                        className="move-edit-pencil move-edit-reset"
                        title="Reset to original move"
                        onClick={() => editState.onReset(pokemonIdx, slot)}
                    >
                        ↺
                    </span>
                ) : null}
            </div>
            <div className="poke-card-move-meta">
                <span className="class-icon">
                    <DamageClassIcon damageClass={move.class} />
                </span>
                {move.type ? <TypePill type={move.type} small /> : null}
            </div>
        </div>
    );
}

function ActivePokemonCard({
    pokemon,
    pokemonIdx,
    editState,
}: {
    pokemon: FormattedPokemon;
    pokemonIdx: number;
    editState: MoveEditState;
}) {
    return (
        <div className="poke-card poke-card-detail">
            <CardHeader pokemon={pokemon} />
            <div className="poke-card-body">
                <div className="poke-card-moves">
                    <ActiveMove move={pokemon["Move 1"]} slot="Move 1" pokemonIdx={pokemonIdx} editState={editState} />
                    <ActiveMove move={pokemon["Move 2"]} slot="Move 2" pokemonIdx={pokemonIdx} editState={editState} />
                    <ActiveMove move={pokemon["Move 3"]} slot="Move 3" pokemonIdx={pokemonIdx} editState={editState} />
                    <ActiveMove move={pokemon["Move 4"]} slot="Move 4" pokemonIdx={pokemonIdx} editState={editState} />
                </div>
                <StatBars stats={pokemon.stats} />
            </div>
            {pokemon["Default Moveset"] ? (
                <div className="default-moveset-tag">default moveset (not custom-set by trainer)</div>
            ) : null}
        </div>
    );
}

export default function BattleBrowser({
    gameTitle,
    trainers,
    storageKey,
    mode,
    highlightCategory,
    quickJumpLabel,
    categoryOrder,
}: BattleBrowserProps) {
    const [activeTrainer, setActiveTrainer] = useState<ActiveTrainer>();
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>();

    const [overrides, setOverrides] = useState(() => loadOverrides(storageKey));
    const [moveNames, setMoveNames] = useState<string[]>([]);
    const [editing, setEditing] = useState<{ pokemonIdx: number; slot: MoveSlot }>();
    const [editValue, setEditValue] = useState("");
    const [editError, setEditError] = useState<string>();
    const [editSaving, setEditSaving] = useState(false);

    useEffect(() => {
        fetchAllMoveNames().then(setMoveNames);
    }, []);

    useEffect(() => {
        setLastGame(storageKey);
    }, [storageKey]);

    const loadTrainer = async (idx: number) => {
        const trainer = trainers[idx];
        const withOverrides = applyOverrides(overrides, trainer.key, trainer.pokemon);
        const formattedPokemon = await Promise.all(withOverrides.map((p) => formatPokemon(p)));
        setActiveTrainer({
            key: trainer.key,
            label: trainer.label,
            idx,
            pokemon: formattedPokemon,
        });
    };

    const editState: MoveEditState = {
        editing,
        value: editValue,
        error: editError,
        saving: editSaving,
        isOverridden: (pokemonIdx, slot) =>
            !!activeTrainer && getOverride(overrides, activeTrainer.key, pokemonIdx, slot) !== undefined,
        onStart: (pokemonIdx, slot, currentName) => {
            setEditing({ pokemonIdx, slot });
            setEditValue(currentName);
            setEditError(undefined);
        },
        onCancel: () => {
            setEditing(undefined);
            setEditError(undefined);
        },
        onChangeValue: (value) => setEditValue(value),
        onSave: async () => {
            if (!editing || !activeTrainer) return;
            const name = editValue.trim();
            if (!name) return;
            setEditSaving(true);
            setEditError(undefined);
            try {
                const detail = await fetchMove(name);
                const updated = setMoveOverride(storageKey, activeTrainer.key, editing.pokemonIdx, editing.slot, detail.name);
                setOverrides(updated);
                const { pokemonIdx, slot } = editing;
                setActiveTrainer((prev) =>
                    prev
                        ? {
                              ...prev,
                              pokemon: prev.pokemon.map((p, i) => (i === pokemonIdx ? { ...p, [slot]: detail } : p)),
                          }
                        : prev
                );
                setEditing(undefined);
            } catch {
                setEditError(`No move named "${name}"`);
            } finally {
                setEditSaving(false);
            }
        },
        onReset: async (pokemonIdx, slot) => {
            if (!activeTrainer) return;
            const updated = setMoveOverride(storageKey, activeTrainer.key, pokemonIdx, slot, null);
            setOverrides(updated);
            const original = trainers[activeTrainer.idx].pokemon[pokemonIdx][slot];
            const detail = original ? await fetchMove(original).catch(() => undefined) : undefined;
            setActiveTrainer((prev) =>
                prev
                    ? { ...prev, pokemon: prev.pokemon.map((p, i) => (i === pokemonIdx ? { ...p, [slot]: detail } : p)) }
                    : prev
            );
        },
    };

    const scrollToElement = (id: string) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth" });
    };

    const quickJumpTrainers = useMemo(
        () => (mode === "flat" && highlightCategory ? trainers.filter((t) => t.category === highlightCategory) : []),
        [mode, highlightCategory, trainers]
    );

    const categories = useMemo(() => {
        if (mode !== "grouped" && mode !== "sequence") return [];
        const seen = new Set<string>();
        const order: string[] = [];
        for (const t of trainers) {
            const cat = t.category || "Other";
            if (!seen.has(cat)) {
                seen.add(cat);
                order.push(cat);
            }
        }
        if (categoryOrder) {
            order.sort((a, b) => {
                const ai = categoryOrder.indexOf(a);
                const bi = categoryOrder.indexOf(b);
                return (ai === -1 ? categoryOrder.length : ai) - (bi === -1 ? categoryOrder.length : bi);
            });
        }
        return order;
    }, [mode, trainers, categoryOrder]);

    const filteredTrainers = useMemo(() => {
        let list = trainers;
        if (mode === "sequence" && categoryFilter) {
            list = list.filter((t) => (t.category || "Other") === categoryFilter);
        }
        const q = search.trim().toLowerCase();
        if (q) {
            list = list.filter((t) => t.label.toLowerCase().includes(q));
        }
        return list;
    }, [trainers, search, mode, categoryFilter]);

    const trainersByCategory = useMemo(() => {
        const map = new Map<string, TrainerEntry[]>();
        for (const t of filteredTrainers) {
            const cat = t.category || "Other";
            if (!map.has(cat)) map.set(cat, []);
            map.get(cat)!.push(t);
        }
        return map;
    }, [filteredTrainers]);

    return (
        <div className="page-container">
            <datalist id={MOVE_OPTIONS_ID}>
                {moveNames.map((name) => (
                    <option value={name} key={name} />
                ))}
            </datalist>

            <NavTabs />

            <Link to="/" className="back-link">
                ← All Games
            </Link>

            {mode === "flat" && !activeTrainer && quickJumpTrainers.length > 0 ? (
                <div className="gym-leaders">
                    {quickJumpTrainers.map((t) => (
                        <div className="gym-leader" onClick={() => scrollToElement(t.key)} key={t.key}>
                            {quickJumpLabel ? quickJumpLabel(t) : t.label}
                        </div>
                    ))}
                </div>
            ) : null}

            {mode === "grouped" && !activeTrainer ? (
                <div className="gym-leaders category-jump">
                    {categories.map((cat) => (
                        <div className="gym-leader" onClick={() => scrollToElement(`category-${cat}`)} key={cat}>
                            {cat}
                        </div>
                    ))}
                </div>
            ) : null}

            {mode === "sequence" && !activeTrainer ? (
                <div className="category-tabs">
                    {categories.map((cat) => (
                        <div
                            className={`category-tab${categoryFilter === cat ? " active" : ""}`}
                            onClick={() => setCategoryFilter(categoryFilter === cat ? undefined : cat)}
                            key={cat}
                        >
                            {cat}
                        </div>
                    ))}
                </div>
            ) : null}

            {activeTrainer ? (
                <div className="trainer">
                    <div className="trainer-header">
                        <div className="trainer-name" onClick={() => setActiveTrainer(undefined)}>
                            {activeTrainer.label}
                        </div>
                    </div>

                    <div className="trainer-pokemon-list">
                        {activeTrainer.pokemon.map((p, i) => (
                            <ActivePokemonCard pokemon={p} pokemonIdx={i} editState={editState} key={i} />
                        ))}
                    </div>

                    <div className="buttons">
                        <div
                            className="button"
                            onClick={() => {
                                if (activeTrainer.idx !== 0) loadTrainer(activeTrainer.idx - 1);
                            }}
                        >
                            Prev
                        </div>
                        <div
                            className="button"
                            onClick={() => {
                                if (activeTrainer.idx !== trainers.length - 1) loadTrainer(activeTrainer.idx + 1);
                            }}
                        >
                            Next
                        </div>
                    </div>
                </div>
            ) : (
                <div className="trainer-list">
                    <div className="trainer-list-header">
                        <h1 className="game-heading">{gameTitle}</h1>
                        {mode === "grouped" || mode === "sequence" ? (
                            <input
                                className="trainer-search"
                                type="text"
                                placeholder="Search trainers..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        ) : null}
                    </div>

                    <br />

                    {mode === "grouped"
                        ? categories.map((cat) => {
                              const catTrainers = trainersByCategory.get(cat);
                              if (!catTrainers || catTrainers.length === 0) return null;
                              return (
                                  <div key={cat}>
                                      <h2 className="category-header" id={`category-${cat}`}>
                                          {cat}
                                      </h2>
                                      {catTrainers.map((trainer) => {
                                          const idx = trainers.indexOf(trainer);
                                          return (
                                              <div className="trainer" id={trainer.key} key={trainer.key}>
                                                  <div className="trainer-header" onClick={() => loadTrainer(idx)}>
                                                      <div className="trainer-name">{trainer.label}</div>
                                                  </div>
                                                  <div className="trainer-pokemon-list">
                                                      {trainer.pokemon.map((p, i) => (
                                                          <PokemonListCard pokemon={p} key={i} />
                                                      ))}
                                                  </div>
                                              </div>
                                          );
                                      })}
                                  </div>
                              );
                          })
                        : filteredTrainers.map((trainer) => {
                              const idx = trainers.indexOf(trainer);
                              return (
                                  <div className="trainer" id={trainer.key} key={trainer.key}>
                                      <div className="trainer-header" onClick={() => loadTrainer(idx)}>
                                          <div className="trainer-heading">
                                              <div className="trainer-name">{trainer.label}</div>
                                              {mode === "sequence" && trainer.category ? (
                                                  <div className="trainer-category-tag">{trainer.category}</div>
                                              ) : null}
                                          </div>
                                          <div className="trainer-open-hint">View team →</div>
                                      </div>
                                      <div className="trainer-pokemon-list">
                                          {trainer.pokemon.map((p, i) => (
                                              <PokemonListCard pokemon={p} key={i} />
                                          ))}
                                      </div>
                                  </div>
                              );
                          })}
                </div>
            )}
        </div>
    );
}
