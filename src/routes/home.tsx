import { Link } from "react-router";
import { TrainerPokemonHash } from "../assets/mogul-platinum/TrainerPokemon";
import bossTeamsData from "../assets/dreamstone-mysteries/boss-teams-full.json";

const games = [
    {
        id: "mogul-platinum",
        path: "/mogul-platinum",
        title: "Mogul Platinum",
        trainerCount: Object.keys(TrainerPokemonHash).length,
    },
    {
        id: "dreamstone-mysteries",
        path: "/dreamstone-mysteries",
        title: bossTeamsData.Game,
        subtitle: bossTeamsData.Version,
        trainerCount: Object.keys(bossTeamsData.Trainers).length,
    },
];

export default function Home() {
    return (
        <div className="page-container home-container">
            <h1 className="game-heading">Nuzlocke Battle Prep</h1>
            <p className="home-subtitle">Pick a game to browse boss trainer teams.</p>

            <div className="game-grid">
                {games.map((game) => (
                    <Link to={game.path} className="game-card" key={game.id}>
                        <div className="game-card-title">{game.title}</div>
                        {game.subtitle ? <div className="game-card-subtitle">{game.subtitle}</div> : null}
                        <div className="game-card-meta">{game.trainerCount} trainers</div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
