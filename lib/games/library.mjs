export const GAMES = [
  {
    id: "steam",
    name: "Steam",
    executable: "steam",
    launcher: "steam",
    compatibility: "SUPPORTED",
    installed: false,
    lastPlayed: null,
  },
  {
    id: "epic",
    name: "Epic Games",
    executable: "epicgames",
    launcher: "epic",
    compatibility: "PARTIAL",
    installed: false,
    lastPlayed: null,
  },
  {
    id: "firefox",
    name: "Firefox",
    executable: "firefox",
    launcher: "standalone",
    compatibility: "SUPPORTED",
    installed: false,
    lastPlayed: null,
  },
  {
    id: "manual-example",
    name: "My Game (manual)",
    executable: "/games/MyGame/game.exe",
    arguments: "",
    workingDir: "/games/MyGame",
    launcher: "standalone",
    compatibility: "UNKNOWN",
    installed: false,
    lastPlayed: null,
  },
];

export function getGames() {
  return GAMES;
}

export function getGame(id) {
  return GAMES.find((x) => x.id === id);
}

export function launchGame(id, manager) {
  const g = GAMES.find((x) => x.id === id);
  if (!g) return { ok: false, error: "Game not found" };
  if (manager && manager.sendToAgent) {
    manager.sendToAgent({
      type: "launch_game",
      payload: {
        id: g.id,
        name: g.name,
        executable: g.executable,
        arguments: g.arguments,
        workingDir: g.workingDir,
      },
    });
  }
  return { ok: true, data: g };
}
