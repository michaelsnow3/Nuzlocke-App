// Remembers which game the user was last looking at (battle prep or encounters),
// so switching between the "Battle Prep" and "Encounters" tabs keeps you on the
// same game instead of always resetting to the picker/first game.

const KEY = "nuzlocke-last-game";
const VALID_GAMES = new Set(["mogul-platinum", "dreamstone-mysteries"]);

export function getLastGame(): string | undefined {
    try {
        const value = localStorage.getItem(KEY);
        return value && VALID_GAMES.has(value) ? value : undefined;
    } catch {
        return undefined;
    }
}

export function setLastGame(gameId: string) {
    try {
        localStorage.setItem(KEY, gameId);
    } catch {
        // ignore write failures (e.g. private browsing storage limits)
    }
}

// Where the "Battle Prep" nav tab should point: back to the last game viewed,
// or the game picker (home) if no game has been visited yet.
export function battlePrepPath(): string {
    const last = getLastGame();
    return last ? `/${last}` : "/";
}
