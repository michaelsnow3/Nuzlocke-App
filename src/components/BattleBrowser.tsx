import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Tooltip, Whisper } from "rsuite";
import type { ActiveTrainer, FormattedPokemon, MoveDetail, RawPokemon, TrainerEntry } from "../types/battle";
import { formatPokemon } from "../lib/pokeapi";
import { DamageClassIcon, PowerIcon } from "./MoveIcon";

export interface BattleBrowserProps {
    gameTitle: string;
    trainers: TrainerEntry[];
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

function ActiveMove({ move }: { move?: MoveDetail }) {
    if (!move) return null;
    return (
        <div className="active-pokemon-move">
            <div className="row gap-8">
                <Whisper trigger="click" placement="bottomStart" speaker={<Tooltip>{move.effect}</Tooltip>}>
                    <div className="move-name">{move.name}</div>
                </Whisper>
                {move.power ? (
                    <div className="row gap-4">
                        <PowerIcon />
                        <div className="move-power">{move.power}</div>
                    </div>
                ) : null}
            </div>
            <div className="row gap-4">
                <div className="class-icon">
                    <DamageClassIcon damageClass={move.class} />
                </div>
                <div className={`move-type ${move.type?.toLocaleLowerCase()}`}>{move.type}</div>
            </div>
        </div>
    );
}

function PokemonListCard({ pokemon }: { pokemon: RawPokemon }) {
    return (
        <div className="pokemon-container">
            <div>
                <div className="pokemon-name">
                    {pokemon["Pokémon"]} ({pokemon.Level})
                </div>
                <div className="poke-sprite-container">
                    <img src={pokemon.sprite} className="poke-sprite" alt="" />
                </div>
                <div className="types">
                    {pokemon.types.map((t) => (
                        <div className={`type ${t.toLocaleLowerCase()}`} key={t}>
                            {t}
                        </div>
                    ))}
                </div>
            </div>

            <div className="ability">{pokemon.Ability || ""}</div>
            <div className="item">{pokemon.Item || ""}</div>

            <div className="pokemon-moves">
                <div className="pokemon-move">{pokemon["Move 1"]}</div>
                <div className="pokemon-move">{pokemon["Move 2"]}</div>
                <div className="pokemon-move">{pokemon["Move 3"]}</div>
                <div className="pokemon-move">{pokemon["Move 4"]}</div>
            </div>
            {pokemon["Default Moveset"] ? <div className="default-moveset-tag">default moveset</div> : null}
        </div>
    );
}

function ActivePokemonCard({ pokemon }: { pokemon: FormattedPokemon }) {
    return (
        <div className="active-pokemon-container pokemon-container">
            <div>
                <div className="pokemon-name">
                    {pokemon["Pokémon"]} ({pokemon.Level})
                </div>
                <div className="poke-sprite-container">
                    <img src={pokemon.sprite} className="poke-sprite" alt="" />
                </div>
                <div className="types">
                    {pokemon.types.map((t) => (
                        <div className={`type ${t.toLocaleLowerCase()}`} key={t}>
                            {t}
                        </div>
                    ))}
                </div>
            </div>

            <div className="row gap-8 space-between">
                <div className="ability">{pokemon.Ability || ""}</div>
                <div className="item">{pokemon.Item || ""}</div>
            </div>

            <div className="active-pokemon-moves">
                <ActiveMove move={pokemon["Move 1"]} />
                <ActiveMove move={pokemon["Move 2"]} />
                <ActiveMove move={pokemon["Move 3"]} />
                <ActiveMove move={pokemon["Move 4"]} />
            </div>

            <div className="stats">
                {pokemon.stats.map((s, i) => (
                    <div className={i % 2 === 0 ? "stat-container-1" : "stat-container-2"} key={s.name}>
                        <div className="stat-label">{s.name}</div>
                        <div className="stat-value">{s.value}</div>
                    </div>
                ))}
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
    mode,
    highlightCategory,
    quickJumpLabel,
    categoryOrder,
}: BattleBrowserProps) {
    const [activeTrainer, setActiveTrainer] = useState<ActiveTrainer>();
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>();

    const loadTrainer = async (idx: number) => {
        const trainer = trainers[idx];
        const formattedPokemon = await Promise.all(trainer.pokemon.map((p) => formatPokemon(p)));
        setActiveTrainer({
            key: trainer.key,
            label: trainer.label,
            idx,
            pokemon: formattedPokemon,
        });
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
                <div className="gym-leaders category-jump">
                    {categories.map((cat) => (
                        <div
                            className={`gym-leader category-filter-chip${categoryFilter === cat ? " active" : ""}`}
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
                            <ActivePokemonCard pokemon={p} key={i} />
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
                                          <div className="trainer-name">{trainer.label}</div>
                                          {mode === "sequence" && trainer.category ? (
                                              <div className="trainer-category-tag">{trainer.category}</div>
                                          ) : null}
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
