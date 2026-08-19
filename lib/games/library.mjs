// Game Database - Normalized game metadata
// Images use placeholder gradients until real artwork is integrated

export const GAMES = [
  {
    id: "cyberpunk-2077",
    slug: "cyberpunk-2077",
    name: "Cyberpunk 2077",
    description: "Cyberpunk 2077 is an open-world action-adventure RPG set in the megalopolis of Night City. You play as V, a mercenary outlaw going after a one-of-a-kind implant that is the key to immortality.",
    shortDescription: "An open-world action-adventure RPG set in Night City.",
    heroImage: null,
    coverImage: null,
    screenshots: [],
    releaseDate: "2020-12-10",
    developer: "CD Projekt Red",
    publisher: "CD Projekt",
    genres: [{ id: 4, name: "Action" }, { id: 5, name: "RPG" }, { id: 31, name: "Adventure" }],
    rating: 4.2,
    platforms: ["PC"],
    providers: [
      { id: "steam-cp2077", type: "steam", name: "Steam", appId: "1091500", launchMethod: "steam", availability: "available" }
    ],
    availability: "available",
    installed: false,
    favorite: false,
    lastPlayedAt: null,
    playTime: 0,
    running: false,
    compatibility: "SUPPORTED",
  },
  {
    id: "elden-ring",
    slug: "elden-ring",
    name: "Elden Ring",
    description: "A new fantasy action RPG. Rise, Tarnished, and be guided by grace to brandish the power of the Elden Ring and become an Elden Lord in the Lands Between.",
    shortDescription: "A fantasy action RPG from FromSoftware.",
    heroImage: null,
    coverImage: null,
    screenshots: [],
    releaseDate: "2022-02-25",
    developer: "FromSoftware",
    publisher: "Bandai Namco",
    genres: [{ id: 4, name: "Action" }, { id: 5, name: "RPG" }, { id: 31, name: "Adventure" }],
    rating: 4.7,
    platforms: ["PC"],
    providers: [
      { id: "steam-elden", type: "steam", name: "Steam", appId: "1245620", launchMethod: "steam", availability: "available" }
    ],
    availability: "available",
    installed: false,
    favorite: false,
    lastPlayedAt: null,
    playTime: 0,
    running: false,
    compatibility: "SUPPORTED",
  },
  {
    id: "baldurs-gate-3",
    slug: "baldurs-gate-3",
    name: "Baldur's Gate 3",
    description: "Gather your party and return to the Forgotten Realms in a tale of fellowship and betrayal, sacrifice and survival, and the lure of absolute power.",
    shortDescription: "A epic RPG from Larian Studios.",
    heroImage: null,
    coverImage: null,
    screenshots: [],
    releaseDate: "2023-08-03",
    developer: "Larian Studios",
    publisher: "Larian Studios",
    genres: [{ id: 5, name: "RPG" }, { id: 31, name: "Adventure" }, { id: 12, name: "Strategy" }],
    rating: 4.9,
    platforms: ["PC"],
    providers: [
      { id: "steam-bg3", type: "steam", name: "Steam", appId: "1086940", launchMethod: "steam", availability: "available" }
    ],
    availability: "available",
    installed: false,
    favorite: false,
    lastPlayedAt: null,
    playTime: 0,
    running: false,
    compatibility: "SUPPORTED",
  },
  {
    id: "red-dead-redemption-2",
    slug: "red-dead-redemption-2",
    name: "Red Dead Redemption 2",
    description: "America, 1899. Arthur Morgan and the Van der Linde gang are on the run. With federal agents and the best bounty hunters in the nation massing on their heels, the gang must rob, steal and fight their way across the rugged heartland of America.",
    shortDescription: "An epic tale of life in America's unforgiving heartland.",
    heroImage: null,
    coverImage: null,
    screenshots: [],
    releaseDate: "2018-10-26",
    developer: "Rockstar Games",
    publisher: "Rockstar Games",
    genres: [{ id: 4, name: "Action" }, { id: 31, name: "Adventure" }],
    rating: 4.8,
    platforms: ["PC"],
    providers: [
      { id: "steam-rdr2", type: "steam", name: "Steam", appId: "1174180", launchMethod: "steam", availability: "available" }
    ],
    availability: "available",
    installed: false,
    favorite: false,
    lastPlayedAt: null,
    playTime: 0,
    running: false,
    compatibility: "SUPPORTED",
  },
  {
    id: "grand-theft-auto-v",
    slug: "grand-theft-auto-v",
    name: "Grand Theft Auto V",
    description: "Grand Theft Auto V for PC offers players the option to explore the award-winning world of Los Santos and Blaine County in resolutions of up to 4k and beyond, as well as the chance to experience the game running at 60 frames per second.",
    shortDescription: "The iconic open-world crime saga.",
    heroImage: null,
    coverImage: null,
    screenshots: [],
    releaseDate: "2015-04-14",
    developer: "Rockstar North",
    publisher: "Rockstar Games",
    genres: [{ id: 4, name: "Action" }, { id: 31, name: "Adventure" }],
    rating: 4.5,
    platforms: ["PC"],
    providers: [
      { id: "steam-gtav", type: "steam", name: "Steam", appId: "271590", launchMethod: "steam", availability: "available" }
    ],
    availability: "available",
    installed: false,
    favorite: false,
    lastPlayedAt: null,
    playTime: 0,
    running: false,
    compatibility: "SUPPORTED",
  },
  {
    id: "the-witcher-3",
    slug: "the-witcher-3-wild-hunt",
    name: "The Witcher 3: Wild Hunt",
    description: "As war rages on throughout the Northern Realms, you take on a contract from Ciri. The hunter becomes the hunted in this open-world fantasy RPG.",
    shortDescription: "A story-driven open world RPG.",
    heroImage: null,
    coverImage: null,
    screenshots: [],
    releaseDate: "2015-05-18",
    developer: "CD Projekt Red",
    publisher: "CD Projekt",
    genres: [{ id: 4, name: "Action" }, { id: 5, name: "RPG" }, { id: 31, name: "Adventure" }],
    rating: 4.8,
    platforms: ["PC"],
    providers: [
      { id: "steam-witcher3", type: "steam", name: "Steam", appId: "292030", launchMethod: "steam", availability: "available" }
    ],
    availability: "available",
    installed: false,
    favorite: false,
    lastPlayedAt: null,
    playTime: 0,
    running: false,
    compatibility: "SUPPORTED",
  },
  {
    id: "valheim",
    slug: "valheim",
    name: "Valheim",
    description: "A brutal exploration and survival game for 1-10 players set in a procedurally-generated purgatory inspired by Viking culture.",
    shortDescription: "A Viking survival game.",
    heroImage: null,
    coverImage: null,
    screenshots: [],
    releaseDate: "2021-02-02",
    developer: "Iron Gate AB",
    publisher: "Coffee Stain Publishing",
    genres: [{ id: 4, name: "Action" }, { id: 12, name: "Strategy" }, { id: 28, name: "Simulation" }],
    rating: 4.4,
    platforms: ["PC"],
    providers: [
      { id: "steam-valheim", type: "steam", name: "Steam", appId: "892970", launchMethod: "steam", availability: "available" }
    ],
    availability: "available",
    installed: false,
    favorite: false,
    lastPlayedAt: null,
    playTime: 0,
    running: false,
    compatibility: "SUPPORTED",
  },
  {
    id: "stardew-valley",
    slug: "stardew-valley",
    name: "Stardew Valley",
    description: "You've inherited your grandfather's old farm plot in Stardew Valley. Armed with hand-me-down tools and a few coins, you set out to begin your new life.",
    shortDescription: "Build your dream farm.",
    heroImage: null,
    coverImage: null,
    screenshots: [],
    releaseDate: "2016-02-26",
    developer: "ConcernedApe",
    publisher: "ConcernedApe",
    genres: [{ id: 12, name: "Strategy" }, { id: 28, name: "Simulation" }, { id: 31, name: "Adventure" }],
    rating: 4.9,
    platforms: ["PC"],
    providers: [
      { id: "steam-stardew", type: "steam", name: "Steam", appId: "413150", launchMethod: "steam", availability: "available" }
    ],
    availability: "available",
    installed: false,
    favorite: false,
    lastPlayedAt: null,
    playTime: 0,
    running: false,
    compatibility: "SUPPORTED",
  },
  {
    id: "hades",
    slug: "hades",
    name: "Hades",
    description: "Defy the god of the dead as you hack and slash out of the Underworld in this rogue-like dungeon crawler from the creators of Bastion and Transistor.",
    shortDescription: "A rogue-like dungeon crawler.",
    heroImage: null,
    coverImage: null,
    screenshots: [],
    releaseDate: "2020-09-17",
    developer: "Supergiant Games",
    publisher: "Supergiant Games",
    genres: [{ id: 4, name: "Action" }, { id: 31, name: "Adventure" }],
    rating: 4.8,
    platforms: ["PC"],
    providers: [
      { id: "steam-hades", type: "steam", name: "Steam", appId: "1145360", launchMethod: "steam", availability: "available" }
    ],
    availability: "available",
    installed: false,
    favorite: false,
    lastPlayedAt: null,
    playTime: 0,
    running: false,
    compatibility: "SUPPORTED",
  },
  {
    id: "hollow-knight",
    slug: "hollow-knight",
    name: "Hollow Knight",
    description: "Forge your own path in Hollow Knight! An epic action adventure through a vast ruined kingdom of insects and heroes.",
    shortDescription: "A classic 2D action adventure.",
    heroImage: null,
    coverImage: null,
    screenshots: [],
    releaseDate: "2017-02-24",
    developer: "Team Cherry",
    publisher: "Team Cherry",
    genres: [{ id: 4, name: "Action" }, { id: 31, name: "Adventure" }],
    rating: 4.7,
    platforms: ["PC"],
    providers: [
      { id: "steam-hollowknight", type: "steam", name: "Steam", appId: "367520", launchMethod: "steam", availability: "available" }
    ],
    availability: "available",
    installed: false,
    favorite: false,
    lastPlayedAt: null,
    playTime: 0,
    running: false,
    compatibility: "SUPPORTED",
  },
  {
    id: "disco-elysium",
    slug: "disco-elysium",
    name: "Disco Elysium",
    description: "A revolutionary role-playing game. You're a detective with a unique system at your disposal to solve a dreary case in a large city.",
    shortDescription: "A groundbreaking RPG.",
    heroImage: null,
    coverImage: null,
    screenshots: [],
    releaseDate: "2019-10-15",
    developer: "ZA/UM",
    publisher: "ZA/UM",
    genres: [{ id: 5, name: "RPG" }, { id: 31, name: "Adventure" }],
    rating: 4.6,
    platforms: ["PC"],
    providers: [
      { id: "steam-disco", type: "steam", name: "Steam", appId: "632470", launchMethod: "steam", availability: "available" }
    ],
    availability: "available",
    installed: false,
    favorite: false,
    lastPlayedAt: null,
    playTime: 0,
    running: false,
    compatibility: "SUPPORTED",
  },
  {
    id: "factorio",
    slug: "factorio",
    name: "Factorio",
    description: "Factorio is a game about building and creating automated factories to process resources, research technologies, build infrastructure, and defend against aliens.",
    shortDescription: "Build automated factories.",
    heroImage: null,
    coverImage: null,
    screenshots: [],
    releaseDate: "2020-08-14",
    developer: "Wube Software",
    publisher: "Wube Software",
    genres: [{ id: 12, name: "Strategy" }, { id: 28, name: "Simulation" }],
    rating: 4.8,
    platforms: ["PC"],
    providers: [
      { id: "steam-factorio", type: "steam", name: "Steam", appId: "427520", launchMethod: "steam", availability: "available" }
    ],
    availability: "available",
    installed: false,
    favorite: false,
    lastPlayedAt: null,
    playTime: 0,
    running: false,
    compatibility: "SUPPORTED",
  },
];

export function getGames() {
  return GAMES;
}

export function getGame(id) {
  return GAMES.find((x) => x.id === id);
}

export function getGameBySlug(slug) {
  return GAMES.find((x) => x.slug === slug);
}

export function getGamesByGenre(genreName) {
  return GAMES.filter((g) => g.genres?.some((genre) => genre.name.toLowerCase() === genreName.toLowerCase()));
}

export function getGamesByProvider(providerType) {
  return GAMES.filter((g) => g.providers?.some((p) => p.type === providerType));
}

export function getInstalledGames() {
  return GAMES.filter((g) => g.installed);
}

export function getFavoriteGames() {
  return GAMES.filter((g) => g.favorite);
}

export function getRecentlyPlayedGames() {
  return GAMES.filter((g) => g.lastPlayedAt).sort((a, b) => 
    new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime()
  );
}

export function getPopularGames() {
  return [...GAMES].sort((a, b) => (b.rating || 0) - (a.rating || 0));
}

export function searchGames(query) {
  const q = query.toLowerCase();
  return GAMES.filter((g) => 
    g.name.toLowerCase().includes(q) ||
    g.developer?.toLowerCase().includes(q) ||
    g.publisher?.toLowerCase().includes(q) ||
    g.genres?.some((genre) => genre.name.toLowerCase().includes(q))
  );
}

export function launchGame(id, manager) {
  const g = GAMES.find((x) => x.id === id);
  if (!g) return { ok: false, error: "Game not found" };
  
  // Get the primary provider
  const provider = g.providers?.[0];
  
  if (manager && manager.sendToAgent) {
    manager.sendToAgent({
      type: "launch_game",
      payload: {
        id: g.id,
        name: g.name,
        executable: g.executable || provider?.appId,
        arguments: g.arguments,
        workingDir: g.workingDir,
        provider: provider?.type,
        providerAppId: provider?.appId,
        launchMethod: provider?.launchMethod,
      },
    });
  }
  return { ok: true, data: g };
}
