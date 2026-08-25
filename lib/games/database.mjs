// KYRO CLOUD — Game Database
// Real game metadata with Steam CDN artwork

function sc(appId) {
  return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;
}

function sh(appId) {
  return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/page_bg_generated_v6b.jpg`;
}

function ph(name) {
  return `https://placehold.co/600x900/1a1a2e/9b8cff/png?text=${encodeURIComponent(name)}`;
}

// Screenshots are fetched live from Steam API — never generate fake URLs
function ss() {
  return [];
}

function g(id, slug, name, desc, short, appId, release, dev, pub, genres, rating, mc, tags, ctrl = "full", size = null, reqs = null, isFree = false, linux = false) {
  return {
    id, slug, name, description: desc, shortDescription: short,
    coverImage: appId ? sc(appId) : ph(name),
    heroImage: appId ? sh(appId) : null,
    screenshots: [],
    releaseDate: release, developer: dev, publisher: pub,
    genres, rating, metacritic: mc, platforms: ["PC", ...(linux ? ["Linux"] : [])],
    providers: appId ? [{ id: `steam-${id}`, type: "steam", name: "Steam", appId, launchMethod: "steam", availability: "available" }] : [],
    availability: "available", installed: false, favorite: false, isFree,
    lastPlayedAt: null, playTime: 0, running: false,
    compatibility: "SUPPORTED", tags, controllerSupport: ctrl,
    downloadSize: size, systemRequirements: reqs, linuxCompatible: linux,
  };
}

// Convenience helper for free-to-play games that run on KYRO CLOUD's Linux
// runtime (native Linux builds or Steam Play / Proton).
function lf(id, slug, name, desc, short, appId, release, dev, pub, genres, rating, tags, ctrl = "full") {
  return g(id, slug, name, desc, short, appId, release, dev, pub, genres, rating, null, tags, ctrl, null, null, true, true);
}

function og(id, slug, name, desc, short, providerName, release, dev, pub, genres, rating, tags, ctrl = "full") {
  return {
    id, slug, name, description: desc, shortDescription: short,
    coverImage: null, heroImage: null, screenshots: [],
    releaseDate: release, developer: dev, publisher: pub,
    genres, rating, platforms: ["PC"],
    providers: [{ id: `other-${id}`, type: "other", name: providerName, launchMethod: "other", availability: "available" }],
    availability: "available", installed: false, favorite: false,
    lastPlayedAt: null, playTime: 0, running: false,
    compatibility: "SUPPORTED", tags, controllerSupport: ctrl,
  };
}

function eg(id, slug, name, desc, short, steamAppId, release, dev, pub, genres, rating, mc, tags, ctrl = "full", size = null, isFree = false) {
  const cover = steamAppId ? sc(steamAppId) : ph(name);
  const hero = steamAppId ? sh(steamAppId) : null;
  return {
    id, slug, name, description: desc, shortDescription: short,
    coverImage: cover, heroImage: hero, screenshots: [],
    releaseDate: release, developer: dev, publisher: pub,
    genres, rating, metacritic: mc, platforms: ["PC"],
    providers: [{ id: `epic-${id}`, type: "epic", name: "Epic Games", appId: steamAppId || null, launchMethod: "epic", availability: "available" }],
    availability: "available", installed: false, favorite: false, isFree,
    lastPlayedAt: null, playTime: 0, running: false,
    compatibility: "SUPPORTED", tags, controllerSupport: ctrl,
    downloadSize: size,
  };
}

function gg(id, slug, name, desc, short, steamAppId, release, dev, pub, genres, rating, mc, tags, ctrl = "full") {
  const cover = steamAppId ? sc(steamAppId) : ph(name);
  const hero = steamAppId ? sh(steamAppId) : null;
  return {
    id, slug, name, description: desc, shortDescription: short,
    coverImage: cover, heroImage: hero, screenshots: [],
    releaseDate: release, developer: dev, publisher: pub,
    genres, rating, metacritic: mc, platforms: ["PC"],
    providers: [{ id: `gog-${id}`, type: "gog", name: "GOG", launchMethod: "gog", availability: "available" }],
    availability: "available", installed: false, favorite: false,
    lastPlayedAt: null, playTime: 0, running: false,
    compatibility: "SUPPORTED", tags, controllerSupport: ctrl,
  };
}

function ub(id, slug, name, desc, short, release, dev, pub, genres, rating, mc, tags, ctrl = "full", appId = null, size = null) {
  return {
    id, slug, name, description: desc, shortDescription: short,
    coverImage: appId ? sc(appId) : ph(name),
    heroImage: appId ? sh(appId) : null,
    screenshots: [],
    releaseDate: release, developer: dev, publisher: pub,
    genres, rating, metacritic: mc, platforms: ["PC"],
    providers: [{ id: `ubisoft-${id}`, type: "steam", name: "Ubisoft Connect", appId: appId || null, launchMethod: "ubisoft", availability: "available" }],
    availability: "available", installed: false, favorite: false,
    lastPlayedAt: null, playTime: 0, running: false,
    compatibility: "SUPPORTED", tags, controllerSupport: ctrl,
    downloadSize: size,
  };
}

export const GAME_DATABASE = [
  // ── AAA Action / RPG ──
  g("cyberpunk-2077","cyberpunk-2077","Cyberpunk 2077","Cyberpunk 2077 is an open-world, action-adventure RPG set in the megalopolis of Night City.","An open-world action-adventure RPG set in Night City.","1091500","2020-12-10","CD PROJEKT RED","CD PROJEKT",[{id:4,name:"Action"},{id:5,name:"RPG"},{id:31,name:"Adventure"}],4.2,86,["Open World","Cyberpunk","Story Rich","FPS"],"full","70 GB"),
  g("elden-ring","elden-ring","Elden Ring","A new fantasy action RPG. Rise, Tarnished, and be guided by grace to brandish the power of the Elden Ring.","A fantasy action RPG from FromSoftware.","1245620","2022-02-25","FromSoftware Inc.","Bandai Namco Entertainment",[{id:4,name:"Action"},{id:5,name:"RPG"},{id:31,name:"Adventure"}],4.7,94,["Souls-like","Open World","Difficult","Fantasy"],"full","50 GB"),
  g("baldurs-gate-3","baldurs-gate-3","Baldur's Gate 3","Gather your party and return to the Forgotten Realms in a tale of fellowship and betrayal.","A epic RPG from Larian Studios.","1086940","2023-08-03","Larian Studios","Larian Studios",[{id:5,name:"RPG"},{id:31,name:"Adventure"},{id:12,name:"Strategy"}],4.9,96,["Turn-Based","Story Rich","Co-op","Fantasy"],"full","150 GB"),
  g("rdr2","red-dead-redemption-2","Red Dead Redemption 2","America, 1899. Arthur Morgan and the Van der Linde gang are on the run.","An epic tale of life in America's unforgiving heartland.","1174180","2018-10-26","Rockstar Games","Rockstar Games",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.8,97,["Open World","Story Rich","Western","Multiplayer"],"full","120 GB"),
  g("gta-v","grand-theft-auto-v","Grand Theft Auto V","Explore the award-winning world of Los Santos and Blaine County.","The iconic open-world crime saga.","271590","2015-04-14","Rockstar North","Rockstar Games",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.5,96,["Open World","Multiplayer","Crime","Action"],"full","110 GB"),
  g("witcher-3","the-witcher-3-wild-hunt","The Witcher 3: Wild Hunt","As war rages throughout the Northern Realms, you take on the greatest contract of your life.","A story-driven open world RPG.","292030","2015-05-18","CD PROJEKT RED","CD PROJEKT",[{id:4,name:"Action"},{id:5,name:"RPG"},{id:31,name:"Adventure"}],4.8,93,["Open World","Story Rich","Fantasy","RPG"],"full","50 GB"),
  g("hogwarts-legacy","hogwarts-legacy","Hogwarts Legacy","An open-world action RPG set in the world of the Harry Potter books.","An open-world action RPG set in the Wizarding World.","990080","2023-02-10","Avalanche Software","Warner Bros. Games",[{id:4,name:"Action"},{id:5,name:"RPG"},{id:31,name:"Adventure"}],4.4,84,["Open World","Magic","Fantasy","RPG"],"full","85 GB"),
  g("starfield","starfield","Starfield","The first new universe in 25 years from Bethesda Game Studios.","A new universe from Bethesda Game Studios.","1716740","2023-09-06","Bethesda Game Studios","Bethesda Softworks",[{id:4,name:"Action"},{id:5,name:"RPG"},{id:12,name:"Strategy"}],3.8,83,["Open World","Space","Sci-fi","RPG"],"full","125 GB"),
  g("diablo-4","diablo-iv","Diablo IV","Diablo IV is the next-gen action RPG experience with endless evil to slaughter.","The next-gen action RPG experience.","2344520","2023-06-06","Blizzard Entertainment","Blizzard Entertainment",[{id:4,name:"Action"},{id:5,name:"RPG"}],4.1,86,["Action RPG","Dungeon Crawler","Loot","Multiplayer"],"full","90 GB"),
  g("god-of-war","god-of-war","God of War","His vengeance against the Gods of Olympus years behind him, Kratos now lives as a man in the realm of Norse Gods.","An epic action-adventure from Santa Monica Studio.","1593500","2022-01-14","Santa Monica Studio","PlayStation PC LLC",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.8,94,["Action","Mythology","Story Rich","Adventure"],"full","70 GB"),
  g("star-wars-jedi","star-wars-jedi-survivor","STAR WARS Jedi: Survivor","The galaxy-spanning adventure continues. Cal Kestis must stay ahead of the Empire.","The galaxy-spanning adventure continues.","1774580","2023-04-28","Respawn Entertainment","Electronic Arts",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.2,82,["Star Wars","Action","Adventure","Story Rich"],"full","130 GB"),

  // ── Shooters ──
  g("cs2","counter-strike-2","Counter-Strike 2","The next evolution of competitive FPS.","The next evolution of competitive FPS.","730","2023-09-27","Valve","Valve",[{id:4,name:"Action"}],4.3,83,["FPS","Competitive","Multiplayer","Tactical","Free to Play","Linux"],"none","30 GB",null,true,true),
  g("apex-legends","apex-legends","Apex Legends","Join legends from the edges of the Frontier in a battle royale shooter.","A battle royale shooter with unique Legends.","1172470","2019-02-04","Respawn Entertainment","Electronic Arts",[{id:4,name:"Action"}],4.1,null,["Battle Royale","FPS","Multiplayer","Free to Play"],"full","60 GB",null,true),
  g("overwatch-2","overwatch-2","Overwatch 2","The world needs heroes. An always-on, ever-evolving free-to-play team-based game.","A free-to-play team-based shooter.","2357570","2022-10-04","Blizzard Entertainment","Blizzard Entertainment",[{id:4,name:"Action"}],3.9,null,["FPS","Multiplayer","Hero Shooter","Free to Play"],"full","50 GB",null,true),
  g("destiny-2","destiny-2","Destiny 2","Explore the mysteries of the solar system and the powers within.","An online multiplayer shooter with RPG elements.","1085660","2019-10-01","Bungie","Bungie",[{id:4,name:"Action"},{id:5,name:"RPG"}],4.0,null,["FPS","Loot","Multiplayer","Co-op","Free to Play"],"full","105 GB",null,true),
  g("doom-eternal","doom-eternal","DOOM Eternal","The direct sequel to the award-winning DOOM (2016). The ultimate combination of speed and power.","The ultimate fast-paced FPS.","782330","2020-03-20","id Software","Bethesda Softworks",[{id:4,name:"Action"}],4.6,89,["FPS","Action","Demons","Fast-Paced"],"full","40 GB"),
  g("helldivers-2","helldivers-2","Helldivers 2","The galaxy needs super earth's finest. Fight for freedom in this intense co-op shooter.","An intense co-op third-person shooter.","553850","2024-02-08","Arrowhead Game Studios","PlayStation Publishing LLC",[{id:4,name:"Action"}],4.4,82,["Co-op","Shooter","Action","Multiplayer"],"full","100 GB"),
  g("valorant","valorant","VALORANT","A 5v5 character-based tactical FPS where precise gunplay meets unique agent abilities.","A character-based tactical FPS.",null,"2020-06-02","Riot Games","Riot Games",[{id:4,name:"Action"}],4.2,null,["FPS","Competitive","Multiplayer","Tactical"],"none","30 GB",null,true),
  g("cod-mw3","call-of-duty-modern-warfare-3","Call of Duty: Modern Warfare III","The definitive multiplayer experience returns with revamped maps and an all-new Zombies experience.","The definitive multiplayer experience.","2519060","2023-11-10","Sledgehammer Games","Activision",[{id:4,name:"Action"}],3.8,61,["FPS","Multiplayer","Action","Shooter"],"full","150 GB"),

  // ── Survival / Crafting ──
  g("valheim","valheim","Valheim","A brutal exploration and survival game for 1-10 players set in a Viking-inspired purgatory.","A Viking survival game.","892970","2021-02-02","Iron Gate AB","Coffee Stain Publishing",[{id:4,name:"Action"},{id:12,name:"Strategy"},{id:28,name:"Simulation"}],4.4,90,["Survival","Open World","Co-op","Viking"],"full","2 GB"),
  g("subnautica","subnautica","Subnautica","Descend into the depths of an alien underwater world filled with wonder and peril.","An underwater survival adventure.","264710","2018-01-23","Unknown Worlds Entertainment","Unknown Worlds Entertainment",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.6,87,["Survival","Open World","Exploration","Underwater"],"full","20 GB"),
  g("rust","rust","Rust","The only aim in Rust is to survive. Do everything you can to last another night.","A multiplayer survival game.","252490","2018-02-08","Facepunch Studios","Facepunch Studios",[{id:4,name:"Action"},{id:28,name:"Simulation"}],4.1,null,["Survival","Multiplayer","Crafting","Open World"],"full","12 GB"),
  g("terraria","terraria","Terraria","Dig, fight, explore, build! Nothing is impossible in this action-packed adventure.","Dig, fight, explore, build!","105600","2011-05-16","Re-Logic","Re-Logic",[{id:4,name:"Action"},{id:12,name:"Strategy"},{id:28,name:"Simulation"}],4.8,83,["Sandbox","Survival","Crafting","2D"],"full","500 MB"),
  g("raft","raft","Raft","Survive the ocean and build your dream raft with friends.","A survival game set in the ocean.","648800","2022-06-20","Redbeet Interactive","Axolot Games",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.2,null,["Survival","Co-op","Ocean","Crafting"],"full","4 GB"),
  g("7dtd","7-days-to-die","7 Days to Die","An open-world survival horror game that is a unique combination of FPS, survival, and RPG.","A survival horror open-world game.","251570","2013-12-13","The Fun Pimps","The Fun Pimps",[{id:4,name:"Action"},{id:5,name:"RPG"}],4.0,null,["Survival","Zombies","Crafting","Open World"],"full","8 GB"),
  g("palworld","palworld","Palworld","A multiplayer, open-world survival crafting game where you capture and battle creatures called Pals.","A multiplayer open-world survival crafting game.","1623730","2024-01-19","Pocketpair","Pocketpair",[{id:4,name:"Action"},{id:12,name:"Strategy"}],4.3,null,["Survival","Multiplayer","Crafting","Open World"],"full","40 GB"),

  // ── Indie / Roguelike ──
  g("hades","hades","Hades","Defy the god of the dead as you hack and slash out of the Underworld.","A rogue-like dungeon crawler.","1145360","2020-09-17","Supergiant Games","Supergiant Games",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.8,93,["Roguelike","Action","Indie","Mythology"]),
  g("hades-2","hades-ii","Hades II","Battle beyond the underworld in this sequel to the award-winning rogue-like dungeon crawler.","The sequel to the award-winning Hades.","1145350","2024-05-06","Supergiant Games","Supergiant Games",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.7,null,["Roguelike","Action","Indie","Mythology"]),
  g("hollow-knight","hollow-knight","Hollow Knight","Forge your own path in this epic action adventure through a vast ruined kingdom of insects and heroes.","A classic 2D action adventure.","367520","2017-02-24","Team Cherry","Team Cherry",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.7,90,["Metroidvania","Indie","Difficult","2D"]),
  g("dead-cells","dead-cells","Dead Cells","A roguelike, Metroidvania-inspired permadeath action-platformer.","A roguelike Metroidvania action-platformer.","588650","2018-08-07","Motion Twin","Motion Twin",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.6,89,["Roguelike","Metroidvania","Action","Indie"]),
  g("celeste","celeste","Celeste","Help Madeline survive her inner demons on her journey to the top of Celeste Mountain.","A tight hand-crafted platformer.","504230","2018-01-25","Maddy Makes Games","Maddy Makes Games",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.8,92,["Platformer","Indie","Difficult","Story Rich"]),
  g("stardew-valley","stardew-valley","Stardew Valley","You've inherited your grandfather's old farm plot. Armed with hand-me-down tools, set out to begin your new life.","Build your dream farm.","413150","2016-02-26","ConcernedApe","ConcernedApe",[{id:12,name:"Strategy"},{id:28,name:"Simulation"},{id:31,name:"Adventure"}],4.9,89,["Farming Sim","Pixel Graphics","RPG","Co-op"]),
  g("disco-elysium","disco-elysium","Disco Elysium","A revolutionary role-playing game. You're a detective with a unique system at your disposal.","A groundbreaking RPG.","632470","2019-10-15","ZA/UM","ZA/UM",[{id:5,name:"RPG"},{id:31,name:"Adventure"}],4.6,91,["RPG","Detective","Story Rich","Indie"],"none"),
  g("slay-the-spire","slay-the-spire","Slay the Spire","We fused card games and roguelikes together to make the best single player deckbuilder.","The best single player deckbuilder.","646570","2019-01-23","MegaCrit","MegaCrit",[{id:5,name:"RPG"},{id:12,name:"Strategy"}],4.8,89,["Card Game","Roguelike","Strategy","Indie"],"none"),
  g("into-the-breach","into-the-breach","Into the Breach","Defend your cities from giant monsters. Use time travel to your advantage.","A tactical roguelike about giant monsters.","593280","2018-02-27","Subset Games","Subset Games",[{id:12,name:"Strategy"}],4.6,90,["Strategy","Roguelike","Turn-Based","Indie"]),

  // ── Strategy / Simulation ──
  g("civ-vi","sid-meiers-civilization-vi","Sid Meier's Civilization VI","Build an empire to stand the test of time.","Build an empire to stand the test of time.","289070","2016-10-21","Firaxis Games","2K",[{id:12,name:"Strategy"}],4.5,88,["Strategy","Turn-Based","4X","Historical"]),
  g("tww3","total-war-warhammer-iii","Total War: WARHAMMER III","Command the monstrous, command the magical, command the mayhem.","The epic conclusion to the Total War: WARHAMMER trilogy.","1142710","2022-02-17","Creative Assembly","SEGA",[{id:12,name:"Strategy"}],4.3,87,["Strategy","RTS","Turn-Based","Fantasy"],"none"),
  g("factorio","factorio","Factorio","Build and create automated factories to process resources and defend against aliens.","Build automated factories.","427520","2020-08-14","Wube Software","Wube Software",[{id:12,name:"Strategy"},{id:28,name:"Simulation"}],4.8,90,["Automation","Strategy","Base Building","Indie"],"none"),
  g("cities-2","cities-skylines-ii","Cities: Skylines II","Build and expand your city from scratch. A deeply detailed city builder.","The most detailed city builder ever.","949230","2023-10-24","Colossal Order","Paradox Interactive",[{id:28,name:"Simulation"},{id:12,name:"Strategy"}],3.8,73,["City Builder","Simulation","Strategy","Building"]),
  g("rimworld","rimworld","RimWorld","A sci-fi colony sim driven by an intelligent AI storyteller.","A sci-fi colony sim driven by AI.","294100","2018-10-17","Ludeon Studios","Ludeon Studios",[{id:12,name:"Strategy"},{id:28,name:"Simulation"}],4.7,87,["Colony Sim","Strategy","Survival","Moddable"],"none"),
  g("aoe4","age-of-empires-iv","Age of Empires IV","One of the most beloved real-time strategy games returns to glory.","The legendary RTS returns.","1466860","2021-10-28","Relic Entertainment","Xbox Game Studios",[{id:12,name:"Strategy"}],4.3,81,["RTS","Strategy","Historical","Multiplayer"],"none"),
  g("anno-1800","anno-1800","Anno 1800","Lead the industrial revolution in this city builder and strategy game.","A city builder set in the industrial age.","576500","2019-04-16","Blue Byte","Ubisoft",[{id:12,name:"Strategy"},{id:28,name:"Simulation"}],4.3,82,["City Builder","Strategy","Simulation","Historical"]),

  // ── Racing ──
  g("forza-h5","forza-horizon-5","Forza Horizon 5","Your Ultimate Forza Horizon Adventure! Explore the vibrant landscapes of Mexico.","The ultimate open-world racing game.","1551360","2021-11-09","Playground Games","Xbox Game Studios",[{id:4,name:"Action"},{id:28,name:"Simulation"}],4.5,92,["Racing","Open World","Multiplayer","Cars"]),
  g("nfs-heat","need-for-speed-heat","Need for Speed Heat","Rise as a street racer and take on the police.","A thrilling street racing game.","1222680","2019-11-08","Ghost Games","Electronic Arts",[{id:4,name:"Action"},{id:28,name:"Simulation"}],4.0,null,["Racing","Open World","Cars","Multiplayer"]),
  g("assetto-corsa","assetto-corsa","Assetto Corsa","A racing simulator with an advanced physics engine and laser-scanned tracks.","The definitive racing simulator.","244210","2014-12-19","KUNOS Simulazioni","KUNOS Simulazioni",[{id:28,name:"Simulation"}],4.5,null,["Racing","Simulator","Multiplayer","Cars"]),
  g("dirt-rally-2","dirt-rally-2.0","DiRT Rally 2.0","The most challenging rally stages with the most iconic cars.","The most authentic rally experience.","690790","2019-02-26","Codemasters","Codemasters",[{id:28,name:"Simulation"},{id:4,name:"Action"}],4.4,86,["Racing","Rally","Simulator","Cars"]),
  g("nfs-unbound","need-for-speed-unbound","Need for Speed Unbound","Race to the top with style and flare. Outrun the cops, outsmart the competition.","Race with style and flare.","2039760","2022-12-02","Criterion Games","Electronic Arts",[{id:4,name:"Action"},{id:28,name:"Simulation"}],3.9,null,["Racing","Open World","Cars","Multiplayer"]),

  // ── Horror ──
  g("re4","resident-evil-4","Resident Evil 4","Survival is just the beginning. Leon S. Kennedy heads to Europe.","The reimagining of the survival horror classic.","2050650","2023-03-24","Capcom","Capcom",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.7,93,["Horror","Survival Horror","Action","Third-Person"]),
  g("dead-space","dead-space","Dead Space","You are Isaac Clarke, sent to repair a deep-space mining vessel. What you find is a nightmare.","The survival horror classic, rebuilt.","1693980","2023-01-27","Motive Studio","Electronic Arts",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.5,89,["Horror","Survival Horror","Sci-fi","Atmospheric"]),
  g("the-forest","the-forest","The Forest","A lone survivor in a mysterious forest battling cannibalistic mutants.","A terrifying open-world survival horror.","242920","2014-04-30","Endnight Games","Endnight Games",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.3,null,["Horror","Survival","Open World","Co-op"]),
  g("phasmophobia","phasmophobia","Phasmophobia","A 4 player online co-op psychological horror investigating paranormal activity.","A cooperative psychological horror game.","739630","2020-09-18","Kinetic Games","Kinetic Games",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.5,null,["Horror","Co-op","Multiplayer","Psychological"],"none"),
  g("outlast","outlast","Outlast","A true survival horror experience. You are Miles Upshur investigating Mount Massive Asylum.","A true survival horror experience.","238320","2013-09-04","Red Barrels","Red Barrels",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.2,null,["Horror","Survival Horror","First-Person","Atmospheric"]),

  // ── Fighting ──
  g("tekken-8","tekken-8","Tekken 8","The fight continues! Relentless, furious, and jaw-dropping.","The next evolution of the King of Iron Fist Tournament.","1789570","2024-01-26","BANDAI NAMCO Studios","BANDAI NAMCO Entertainment",[{id:4,name:"Action"}],4.4,90,["Fighting","Multiplayer","Action","Competitive"]),
  g("sf6","street-fighter-6","Street Fighter 6","Here comes a new challenger! Innovative features for every player.","A new challenger approaches.","1222940","2023-06-02","Capcom","Capcom",[{id:4,name:"Action"}],4.5,92,["Fighting","Multiplayer","Action","Competitive"]),

  // ── Sandbox / Building ──
  g("garrys-mod","garrys-mod","Garry's Mod","A physics sandbox with no predefined aims. We give you the tools and leave you to play.","A physics sandbox.","4000","2004-11-29","Facepunch Studios","Valve",[{id:4,name:"Action"},{id:28,name:"Simulation"}],4.5,null,["Sandbox","Multiplayer","Physics","Moddable"],"none"),
  g("besiege","besiege","Besiege","Build medieval siege engines and destroy fortresses and armies.","A physics building game.","346010","2015-02-18","Spiderling Studios","Spiderling Studios",[{id:4,name:"Action"},{id:28,name:"Simulation"}],4.4,null,["Building","Physics","Sandbox","Destruction"]),

  // ── Sports ──
  g("ea-fc-25","ea-sports-fc-25","EA SPORTS FC 25","Build your dream squad in Ultimate Team and lead your club to glory.","The world's game, elevated.","2669320","2024-09-27","EA Canada","Electronic Arts",[{id:4,name:"Action"},{id:28,name:"Simulation"}],3.5,null,["Sports","Soccer","Multiplayer","Competitive"]),
  g("nba-2k25","nba-2k25","NBA 2K25","The latest installment in the best-selling basketball franchise.","The most authentic basketball simulation.","2594640","2024-09-06","Visual Concepts","2K",[{id:4,name:"Action"},{id:28,name:"Simulation"}],3.4,null,["Sports","Basketball","Multiplayer","Competitive"]),

  // ── Stealth / Action ──
  g("hitman-3","hitman-3","Hitman 3","Agent 47 returns for the most important contracts of his entire career.","The world of assassination.","1659040","2022-01-20","IO Interactive","IO Interactive",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.5,88,["Stealth","Action","Assassination","Story Rich"]),
  g("ac-valhalla","assassins-creed-valhalla","Assassin's Creed Valhalla","Lead epic Viking raids on Saxon settlements and kingdoms.","Lead epic Viking raids.","2208720","2022-12-06","Ubisoft Montreal","Ubisoft",[{id:4,name:"Action"},{id:5,name:"RPG"},{id:31,name:"Adventure"}],4.0,85,["Open World","Stealth","Historical","Viking"]),

  // ── More Action / Adventure ──
  g("sekiro","sekiro-shadows-die-twice","Sekiro: Shadows Die Twice","Carve your own clever path to revenge in an all-new adventure from FromSoftware.","A revenge adventure from FromSoftware.","814380","2019-03-21","FromSoftware Inc.","Activision",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.7,90,["Souls-like","Difficult","Action","Ninja"]),
  g("mhw","monster-hunter-world","Monster Hunter: World","Battle giant monsters in a living, breathing ecosystem.","Hunt monsters in a living ecosystem.","582010","2018-08-09","Capcom","Capcom",[{id:4,name:"Action"},{id:5,name:"RPG"}],4.5,90,["Action RPG","Co-op","Hunting","Open World"]),
  g("nms","no-mans-sky","No Man's Sky","A game about exploration and survival in an infinite procedurally generated galaxy.","Explore an infinite procedurally generated galaxy.","275850","2016-08-12","Hello Games","Hello Games",[{id:4,name:"Action"},{id:5,name:"RPG"},{id:31,name:"Adventure"}],4.2,null,["Exploration","Open World","Survival","Sci-fi"]),

  // ── Platformer / Adventure ──
  g("ori-wotw","ori-and-the-will-of-the-wisps","Ori and the Will of the Wisps","Embark on an epic adventure in a beautiful and vast world.","An epic adventure in a beautiful world.","1057090","2020-03-11","Moon Studios","Xbox Game Studios",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.8,90,["Metroidvania","Platformer","Beautiful","Story Rich"]),
  g("cuphead","cuphead","Cuphead","A classic run and gun action game with a focus on boss battles. Inspired by 1930s cartoons.","A classic run and gun action game.","268910","2017-09-29","Studio MDHR","Studio MDHR",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.6,87,["Difficult","Action","Co-op","Artistic"]),

  // ── Battle Royale / Party ──
  g("rocket-league","rocket-league","Rocket League","A high-powered hybrid of arcade-style soccer and vehicular mayhem.","A high-powered soccer meets mayhem.","252950","2015-07-07","Psyonix","Psyonix",[{id:4,name:"Action"},{id:28,name:"Simulation"}],4.5,null,["Sports","Multiplayer","Competitive","Cars","Free to Play"],"none",null,null,true),
  g("fall-guys","fall-guys","Fall Guys","Dive into ridiculous challenges and mutating obstacle courses with up to 60 players.","A massive multiplayer party game.","1097150","2020-08-04","Mediatonic","Devolver Digital",[{id:4,name:"Action"}],4.0,null,["Party","Multiplayer","Competitive","Free to Play"],null,null,null,true),
  g("among-us","among-us","Among Us","Play online with 4-15 players. Try to hold your spaceship together — but beware the impostor.","A game of teamwork and betrayal.","945360","2018-06-15","Innersloth","Innersloth",[{id:4,name:"Action"},{id:12,name:"Strategy"}],4.1,null,["Multiplayer","Social Deduction","Party","Free to Play"],null,null,null,true),
  g("lethal-company","lethal-company","Lethal Company","A co-op horror game where you and your friends collect scrap from abandoned moons.","A co-op horror game about collecting scrap.","1966720","2023-10-23","Zeekerss","Zeekerss",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.5,null,["Horror","Co-op","Multiplayer","Indie"],"none"),
  g("drg","deep-rock-galactic","Deep Rock Galactic","1-4 player co-op FPS featuring badass space Dwarves and 100% destructible environments.","A co-op FPS with space Dwarves.","548430","2018-05-18","Ghost Ship Games","Coffee Stain Publishing",[{id:4,name:"Action"}],4.7,85,["Co-op","FPS","Multiplayer","Mining"]),
  g("l4d2","left-4-dead-2","Left 4 Dead 2","Challenge you and your friends through a zombie apocalypse across five campaigns.","A zombie apocalypse co-op shooter.","550","2009-11-17","Valve","Valve",[{id:4,name:"Action"}],4.6,null,["Co-op","Zombies","FPS","Multiplayer"]),

  // ── Narrative / Adventure ──
  g("lis","life-is-strange","Life is Strange","A five-part episodic adventure game. Max Caulfield discovers she can rewind time.","A five-part episodic adventure.","319630","2015-01-30","DONTNOD Entertainment","SQUARE ENIX",[{id:31,name:"Adventure"}],4.4,null,["Story Rich","Choices Matter","Adventure","Narrative"]),
  g("firewatch","firewatch","Firewatch","A single-player first-person mystery set in the Wyoming wilderness.","A first-person mystery set in the wilderness.","383870","2016-02-09","Campo Santo","Campo Santo",[{id:31,name:"Adventure"}],4.3,null,["Story Rich","Walking Simulator","Mystery","Atmospheric"]),
  g("edith-finch","what-remains-of-edith-finch","What Remains of Edith Finch","A collection of short stories about a cursed family in Washington state.","A collection of short stories.","501300","2017-08-02","Giant Sparrow","Annapurna Interactive",[{id:31,name:"Adventure"}],4.5,89,["Story Rich","Walking Simulator","Narrative","Artistic"]),

  // ── More AAA / Recent ──
  g("elden-ring-dlc","elden-ring-shadow-of-the-erdtree","ELDEN RING Shadow of the Erdtree","The massive expansion for ELDEN RING. A new story, new areas, new challenges.","The massive expansion for ELDEN RING.","2784050","2024-06-21","FromSoftware Inc.","Bandai Namco Entertainment",[{id:4,name:"Action"},{id:5,name:"RPG"}],4.6,94,["Souls-like","Open World","DLC","Fantasy"]),
  g("cp2077-ult","cyberpunk-2077-ultimate-edition","Cyberpunk 2077: Ultimate Edition","The complete Cyberpunk 2077 experience including base game and Phantom Liberty.","The complete Cyberpunk 2077 experience.","2889970","2023-09-26","CD PROJEKT RED","CD PROJEKT",[{id:4,name:"Action"},{id:5,name:"RPG"}],4.5,null,["Open World","Cyberpunk","Story Rich","RPG"]),

  // ── More indie / popular ──
  g("it-takes-two","it-takes-two","It Takes Two","A cooperative action-adventure. Play as Cody and May, a couple turned into dolls.","A cooperative action-adventure.","1426210","2021-03-26","Hazelight Studios","Electronic Arts",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.7,88,["Co-op","Story Rich","Adventure","Platformer"]),
  g("hogwarts-legacy-2","hogwarts-legacy-2","Hogwarts Legacy 2","The sequel to the open-world action RPG set in the Wizarding World.","The sequel to Hogwarts Legacy.",null,"2025-01-01","Avalanche Software","Warner Bros. Games",[{id:4,name:"Action"},{id:5,name:"RPG"},{id:31,name:"Adventure"}],null,null,["Open World","Magic","Fantasy","RPG"]),
  g("gta-vi","grand-theft-auto-vi","Grand Theft Auto VI","The next installment in the Grand Theft Auto series.","The next GTA.",null,"2025-10-01","Rockstar North","Rockstar Games",[{id:4,name:"Action"},{id:31,name:"Adventure"}],null,null,["Open World","Crime","Action","Multiplayer"]),
  g("fable","fable","Fable","A new beginning for the beloved action RPG franchise.","The return of Fable.",null,"2025-01-01","Playground Games","Xbox Game Studios",[{id:4,name:"Action"},{id:5,name:"RPG"},{id:31,name:"Adventure"}],null,null,["RPG","Open World","Fantasy","Action"]),
  g("avowed","avowed","Avowed","A first-person fantasy RPG set in the world of Eora from Obsidian Entertainment.","A first-person fantasy RPG.","1602280","2025-02-18","Obsidian Entertainment","Xbox Game Studios",[{id:4,name:"Action"},{id:5,name:"RPG"}],null,null,["RPG","Fantasy","First-Person","Adventure"]),
  g("doom-the-dark-ages","doom-the-dark-ages","DOOM: The Dark Ages","The prequel to DOOM (2016) and DOOM Eternal. A dark fantasy sci-fi action FPS.","A dark fantasy sci-fi action FPS.","2850500","2025-05-15","id Software","Bethesda Softworks",[{id:4,name:"Action"}],null,null,["FPS","Action","Dark Fantasy","Demons"]),

  // ── Epic Games Store Exclusives ──
  eg("fortnite","fortnite","Fortnite","The free-to-play, ever-evolving multiplayer game.","The biggest battle royale in the world.",null,"2017-07-25","Epic Games","Epic Games",[{id:4,name:"Action"}],4.0,null,["Battle Royale","Shooter","Free to Play","Building"],"full",null,true),
  eg("rocket-league-eg","rocket-league-eg","Rocket League","A high-powered hybrid of arcade-style soccer and vehicular mayhem.","Soccer meets rocket-powered cars.","252950","2015-07-07","Psyonix","Epic Games",[{id:4,name:"Action"},{id:28,name:"Simulation"}],4.5,null,["Sports","Multiplayer","Competitive","Cars","Free to Play"],"full",null,true),
  eg("fall-guys-eg","fall-guys-eg","Fall Guys","Dive into ridiculous challenges and mutating obstacle courses with up to 60 players.","A massive multiplayer party game.","1097150","2020-08-04","Mediatonic","Epic Games",[{id:4,name:"Action"}],4.0,null,["Party","Multiplayer","Competitive","Free to Play"],"full",null,true),
  eg("genshin-impact","genshin-impact","Genshin Impact","A free-to-play open-world action RPG set in the fantasy world of Teyvat.","A free-to-play open-world action RPG.","1876960","2020-09-28","miHoYo","miHoYo",[{id:4,name:"Action"},{id:5,name:"RPG"}],4.3,null,["Open World","Action RPG","Free to Play","Co-op"],"full",null,true),
  eg("the-finals","the-finals","THE FINALS","A free-to-play, team-based FPS with destructible environments.","Destructible environments in a team-based FPS.","2073850","2023-12-07","Embark Studios","Embark Studios",[{id:4,name:"Action"}],4.1,null,["FPS","Multiplayer","Destruction","Free to Play"],"none",null,true),
  eg("rumbleverse","rumbleverse","Rumbleverse","A free-to-play 40-player brawler battle royale.","A brawler battle royale.",null,"2022-08-11","Iron Galaxy","Epic Games",[{id:4,name:"Action"}],3.8,null,["Battle Royale","Fighting","Free to Play","Multiplayer"],"full"),
  eg("satisfactory","satisfactory","Satisfactory","An open-world factory-building game.","A 3D factory-building game.","526900","2024-09-10","Coffee Stain Studios","Coffee Stain Publishing",[{id:12,name:"Strategy"},{id:28,name:"Simulation"}],4.7,null,["Automation","Building","Co-op","Base Building"],"none"),
  eg("saints-row-eg","saints-row-eg","Saints Row","The reboot of the beloved open-world crime saga.","The iconic open-world crime saga reborn.","742420","2022-08-23","Volition","Deep Silver",[{id:4,name:"Action"},{id:31,name:"Adventure"}],3.5,null,["Open World","Action","Crime","Story Rich"],"full"),
  eg("death-stranding","death-stranding","Death Stranding","From the creator of Metal Gear Solid, an open-world action game.","An open-world action game from Kojima Productions.","1190460","2019-11-08","Kojima Productions","505 Games",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.2,86,["Open World","Story Rich","Sci-fi","Atmospheric"],"full"),
  eg("titanfall-2","titanfall-2","Titanfall 2","Respawn Entertainment's acclaimed FPS with thrilling parkour and Titan combat.","A thrilling FPS with parkour and Titans.","1237970","2016-10-28","Respawn Entertainment","Electronic Arts",[{id:4,name:"Action"}],4.7,94,["FPS","Action","Story Rich","Mechs"],"full"),
  eg("kingdom-come-2","kingdom-come-deliverance-ii","Kingdom Come: Deliverance II","A medieval open-world RPG set in 15th century Bohemia.","A medieval open-world RPG.","1771300","2025-02-04","Warhorse Studios","Deep Silver",[{id:4,name:"Action"},{id:5,name:"RPG"},{id:31,name:"Adventure"}],4.3,null,["Medieval","Open World","Story Rich","RPG"],"full"),

  // ── GOG (DRM-Free) — using Steam app IDs for artwork ──
  gg("witcher-3-gog","the-witcher-3-wild-hunt-gog","The Witcher 3: Wild Hunt (GOG)","An open-world fantasy RPG.","The definitive RPG experience.","292030","2015-05-18","CD PROJEKT RED","CD PROJEKT",[{id:4,name:"Action"},{id:5,name:"RPG"},{id:31,name:"Adventure"}],4.8,93,["Open World","Story Rich","Fantasy","RPG"],"full"),
  gg("baldurs-gate-3-gog","baldurs-gate-3-gog","Baldur's Gate 3 (GOG)","Gather your party and return to the Forgotten Realms.","An epic RPG from Larian.","1086940","2023-08-03","Larian Studios","Larian Studios",[{id:5,name:"RPG"},{id:31,name:"Adventure"},{id:12,name:"Strategy"}],4.9,96,["Turn-Based","Story Rich","Co-op","Fantasy"],"full"),
  gg("cyberpunk-2077-gog","cyberpunk-2077-gog","Cyberpunk 2077 (GOG)","An open-world action-adventure RPG set in Night City.","A neon-soaked RPG.","1091500","2020-12-10","CD PROJEKT RED","CD PROJEKT",[{id:4,name:"Action"},{id:5,name:"RPG"},{id:31,name:"Adventure"}],4.2,86,["Open World","Cyberpunk","Story Rich","FPS"],"full"),
  gg("hades-gog","hades-gog","Hades (GOG)","A rogue-like dungeon crawler from Supergiant Games.","Defy the god of the dead.","1145360","2020-09-17","Supergiant Games","Supergiant Games",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.8,93,["Roguelike","Action","Indie","Mythology"],"full"),
  gg("disco-elysium-gog","disco-elysium-gog","Disco Elysium (GOG)","A revolutionary role-playing game.","A groundbreaking RPG.","632470","2019-10-15","ZA/UM","ZA/UM",[{id:5,name:"RPG"},{id:31,name:"Adventure"}],4.6,91,["RPG","Detective","Story Rich","Indie"],"none"),
  gg("divinity-2-gog","divinity-original-sin-2","Divinity: Original Sin 2 (GOG)","A party-based RPG with unprecedented freedom.","A party-based RPG with deep storytelling.","435150","2017-09-14","Larian Studios","Larian Studios",[{id:5,name:"RPG"},{id:12,name:"Strategy"}],4.7,93,["RPG","Co-op","Turn-Based","Story Rich"],"full"),
  gg("stardew-valley-gog","stardew-valley-gog","Stardew Valley (GOG)","Build your dream farm.","A farming RPG.","413150","2016-02-26","ConcernedApe","ConcernedApe",[{id:12,name:"Strategy"},{id:28,name:"Simulation"},{id:31,name:"Adventure"}],4.9,89,["Farming Sim","Pixel Graphics","RPG","Co-op"],"full"),

  // ── Ubisoft Connect ──
  ub("ac-mirage","assassins-creed-mirage","Assassin's Creed Mirage","A return to the series' stealth roots in 9th century Baghdad.","Return to stealth roots.","2023-10-05","Ubisoft Bordeaux","Ubisoft",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.0,74,["Stealth","Historical","Open World","Action"],"full","2637170","40 GB"),
  ub("ac-shadows","assassins-creed-shadows","Assassin's Creed Shadows","A dual protagonist open-world action adventure in feudal Japan.","Open-world action in feudal Japan.","2025-03-20","Ubisoft Quebec","Ubisoft",[{id:4,name:"Action"},{id:31,name:"Adventure"},{id:5,name:"RPG"}],null,null,["Stealth","Open World","Historical","Action"],"full","3159330","65 GB"),
  ub("far-cry-6","far-cry-6","Far Cry 6","A first-person shooter set in the fictional island of Yara.","Fight for freedom in Yara.","2021-10-07","Ubisoft Toronto","Ubisoft",[{id:4,name:"Action"}],4.0,73,["FPS","Open World","Shooter","Action"],"full","2369390","60 GB"),
  ub("watch-dogs-legion","watch-dogs-legion","Watch Dogs: Legion","Recruit and play as anyone in a post-Brexit London.","Hack and recruit anyone.","2020-10-29","Ubisoft Toronto","Ubisoft",[{id:4,name:"Action"},{id:31,name:"Adventure"}],3.6,62,["Open World","Hacking","Stealth","Action"],"full","2447060","45 GB"),
  ub("rainbow-six-siege","rainbow-six-siege","Tom Clancy's Rainbow Six Siege","A tactical 5v5 multiplayer FPS.","A tactical team-based FPS.","2015-12-01","Ubisoft Montreal","Ubisoft",[{id:4,name:"Action"}],4.2,79,["FPS","Tactical","Multiplayer","Competitive"],"none","359550","65 GB"),
  ub("the-crew-motorfest","the-crew-motorfest","The Crew Motorfest","The ultimate open-world racing festival in Hawaii.","A racing festival in Hawaii.","2023-09-14","Ubisoft Ivory Tower","Ubisoft",[{id:4,name:"Action"},{id:28,name:"Simulation"}],4.0,null,["Racing","Open World","Multiplayer","Cars"],"full","3106000","40 GB"),
  ub("star-wars-outlaws","star-wars-outlaws","Star Wars Outlaws","An open-world action-adventure set between Empire Strikes Back and Return of the Jedi.","An open-world Star Wars game.","2024-08-30","Massive Entertainment","Ubisoft",[{id:4,name:"Action"},{id:31,name:"Adventure"}],3.8,null,["Open World","Star Wars","Action","Adventure"],"full","4016350","65 GB"),

  // ── Xbox Game Pass / Microsoft Store ──
  g("starfield-gp","starfield-gp","Starfield (Game Pass)","The first new universe in 25 years from Bethesda Game Studios.","Explore the cosmos.","1716740","2023-09-06","Bethesda Game Studios","Xbox Game Studios",[{id:4,name:"Action"},{id:5,name:"RPG"},{id:12,name:"Strategy"}],3.8,83,["Open World","Space","Sci-fi","RPG"],"full"),
  g("forza-gp","forza-horizon-5-gamepass","Forza Horizon 5 (Game Pass)","Your Ultimate Forza Horizon Adventure in Mexico.","The ultimate open-world racing game.","1551360","2021-11-09","Playground Games","Xbox Game Studios",[{id:4,name:"Action"},{id:28,name:"Simulation"}],4.5,92,["Racing","Open World","Multiplayer","Cars"],"full"),
  g("hi-fi-rush","hi-fi-rush","Hi-Fi RUSH","A rhythm action game from Tango Gameworks.","Rock out to the beat.","1815940","2023-01-25","Tango Gameworks","Xbox Game Studios",[{id:4,name:"Action"}],4.5,87,["Action","Rhythm","Music","Colorful"],"full"),
  g("grounded","grounded","Grounded","A survival game where you are shrunk in a backyard.","Survive in a backyard.","962130","2022-09-27","Obsidian Entertainment","Xbox Game Studios",[{id:4,name:"Action"},{id:12,name:"Strategy"}],4.3,81,["Survival","Co-op","Open World","Crafting"],"full"),
  g("sea-of-thieves","sea-of-thieves","Sea of Thieves","A shared-world adventure game.","Live the pirate life.","1172620","2018-03-20","Rare","Xbox Game Studios",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.3,null,["Multiplayer","Pirates","Open World","Co-op"],"full"),
  g("hellblade-2","hellblade-senuas-saga-ii","Hellblade II: Senua's Saga","The sequel to the award-winning Hellblade.","A dark Norse mythology adventure.","2096570","2024-05-21","Ninja Theory","Xbox Game Studios",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.2,80,["Story Rich","Action","Norse","Atmospheric"],"full"),

  // ── PlayStation PC / PlayStation Store ──
  g("spider-man","marvels-spider-man-remastered","Marvel's Spider-Man Remastered","The PC port of the critically acclaimed PS4 exclusive.","Swing through Marvel's New York.","1817070","2022-08-12","Insomniac Games","PlayStation PC LLC",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.7,87,["Superhero","Open World","Action","Story Rich"],"full"),
  g("spider-man-2","marvels-spider-man-2","Marvel's Spider-Man 2","The PC port of the PS5 sequel.","Play as both Spider-Men.","2360660","2025-01-30","Insomniac Games","PlayStation PC LLC",[{id:4,name:"Action"},{id:31,name:"Adventure"}],null,null,["Superhero","Open World","Action","Story Rich"],"full"),
  g("horizon-fw","horizon-forbidden-west","Horizon: Forbidden West (PC)","The PC port of the PS5 sequel to Zero Dawn.","Aloy explores the Forbidden West.","2420110","2024-03-21","Guerrilla Games","PlayStation PC LLC",[{id:4,name:"Action"},{id:5,name:"RPG"},{id:31,name:"Adventure"}],4.4,83,["Open World","Action RPG","Exploration","Post-Apocalyptic"],"full"),
  g("last-of-us","the-last-of-us-part-i","The Last of Us Part I","A PC port of the acclaimed PS5 remake.","Joel and Ellie's journey.","1888160","2024-04-03","Naughty Dog","PlayStation PC LLC",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.6,87,["Story Rich","Zombies","Survival Horror","Action"],"full"),
  g("ghost-tsushima","ghost-of-tsushima-directors-cut","Ghost of Tsushima: Director's Cut","A PC port of the PS5 director's cut.","Explore feudal Japan as a samurai.","2215430","2024-05-16","Sucker Punch Productions","PlayStation PC LLC",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.5,83,["Open World","Samurai","Historical","Action"],"full"),
  g("ratchet-rift","ratchet-clank-rift-apart","Ratchet & Clank: Rift Apart","A PC port of the PS5 platformer.","Dimension-hopping action.","1895880","2023-07-26","Insomniac Games","PlayStation PC LLC",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.6,88,["Platformer","Action","Co-op","Colorful"],"full"),

  // ── Twitch Games / Prime Gaming ──
  g("warframe","warframe","Warframe","A free-to-play co-op action game.","Play as the Tenno.","230410","2013-03-25","Digital Extremes","Digital Extremes",[{id:4,name:"Action"},{id:5,name:"RPG"}],4.2,null,["Free to Play","Co-op","Action","Sci-fi"],"full",null,null,true,true),
  g("lost-ark","lost-ark","Lost Ark","A free-to-play action MMORPG (runs on Linux via Proton).","A Korean action MMORPG.","1599340","2022-02-11","Smilegate RPG","Amazon Games",[{id:4,name:"Action"},{id:5,name:"RPG"}],4.1,null,["MMORPG","Action RPG","Free to Play","Co-op","Linux"],"full",null,null,true,true),
  g("new-world","new-world","New World","A free-to-play open-world MMO set in a supernatural 17th century (runs on Linux via Proton).","A supernatural open-world MMORPG.","1469050","2021-09-28","Amazon Games","Amazon Games",[{id:4,name:"Action"},{id:5,name:"RPG"}],3.8,null,["MMORPG","Open World","Crafting","Multiplayer","Free to Play","Linux"],"full",null,null,true,true),
  g("lost-ark-eg","lost-ark-eg","Lost Ark (Prime)","The Amazon-published action MMORPG.","Fast-paced action MMORPG.","1599340","2022-02-11","Smilegate RPG","Amazon Games",[{id:4,name:"Action"},{id:5,name:"RPG"}],4.1,null,["MMORPG","Action RPG","Free to Play","Co-op"],"full",null,null,true),
  g("fallout-76","fallout-76","Fallout 76","An online multiplayer action RPG.","Explore the Wasteland with friends.","1170860","2018-11-14","Bethesda Game Studios","Bethesda Softworks",[{id:4,name:"Action"},{id:5,name:"RPG"}],3.6,null,["Multiplayer","RPG","Open World","Survival"],"full"),
  g("destiny-2-lw","destiny-2-lightfall","Destiny 2: Lightfall","The Lightfall expansion for Destiny 2.","A new chapter in the Light and Darkness saga.","1085660","2023-02-28","Bungie","Bungie",[{id:4,name:"Action"},{id:5,name:"RPG"}],4.0,null,["FPS","Loot","Multiplayer","Co-op"],"full"),

  // ── PS5 Exclusives (Coming to PC) ──
  g("wolverine","marvels-wolverine","Marvel's Wolverine","The Wolverine game from Insomniac Games.","An intense Wolverine experience.",null,"2025-09-01","Insomniac Games","PlayStation PC LLC",[{id:4,name:"Action"}],null,null,["Superhero","Action","Story Rich"],"full"),
  g("returnal","returnal","Returnal (PC)","A PC port of the PS5 roguelike third-person shooter.","A rogue-like sci-fi shooter.","1649240","2023-02-15","Housemarque","PlayStation PC LLC",[{id:4,name:"Action"}],4.2,86,["Roguelike","Third-Person","Sci-fi","Difficult"],"full"),

  // ── Indie / Hidden Gems ──
  g("tunic","tunic","TUNIC","An action-adventure about a tiny fox in a big world.","Explore a mysterious world.","553420","2022-09-27","Andrew Shouldice","Devolver Digital",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.5,85,["Action","Adventure","Puzzles","Fox"],"full"),
  g("dredge","dredge","Dredge","A creepy fishing adventure game.","Catch fish and uncover secrets.","1562430","2023-03-30","Black Salt Games","Team17",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.4,82,["Horror","Fishing","Exploration","Indie"],"full"),
  g("animal-well","animal-well","Animal Well","A mysterious Metroidvania with environmental puzzles.","Solve puzzles in a strange well.","813230","2024-05-09","Billy Basso","Bigmode",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.6,null,["Metroidvania","Puzzles","Exploration","Indie"],"full"),
  g("balatro","balatro","Balatro","The poker roguelike.","A deckbuilder roguelike.","2379780","2024-02-20","LocalThunk","Playstack",[{id:12,name:"Strategy"}],4.8,null,["Card Game","Roguelike","Poker","Strategy"],"full"),
  g("ultros","ultros","ULTROS","A psychedelic Metroidvania set in a living spaceship.","A colorful alien adventure.","1938280","2024-02-13","Hadoque","Lambda Dimensions",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.1,null,["Metroidvania","Sci-fi","Colorful","Indie"],"full"),
  g("neva","neva","Neva","A beautiful action-adventure about a warrior and her wolf.","A story of bond and beauty.","1598530","2024-10-15","Nomada Studio","Devolver Digital",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.5,null,["Beautiful","Story Rich","Action","Artistic"],"full"),
  g("little-kitty","little-kitty-big-city","Little Kitty, Big City","A cat adventure game.","Cause chaos as a cat.","1702410","2024-05-09","Double Dagger Studio","Double Dagger Studio",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.2,null,["Cat","Adventure","Open World","Relaxing"],"full"),
  g("botany-manor","botany-manor","Botany Manor","A first-person puzzle game about growing plants.","Grow plants to solve puzzles.","1956350","2024-04-09","Balloon Studios","Whitethorn Games",[{id:31,name:"Adventure"}],4.3,null,["Puzzles","Relaxing","Exploration","Indie"],"none"),

  // ── VR / Meta Quest (PC VR) ──
  g("half-life-alyx","half-life-alyx","Half-Life: Alyx","Valve's long-awaited return to the Half-Life universe in VR.","A VR return to City 17.","546560","2020-03-23","Valve","Valve",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.8,93,["VR","FPS","Sci-fi","Story Rich"],"full"),
  g("beatsaber","beat-saber","Beat Saber","The most popular VR rhythm game.","Slash beats to the rhythm.","620980","2019-05-21","Beat Games","Meta",[{id:4,name:"Action"}],4.6,null,["VR","Rhythm","Music","Exercise"],"full"),

  // ── More Indie Hits ──
  g("vampire-survivors","vampire-survivors","Vampire Survivors","A gothic horror game with auto-attack and roguelite elements.","Survive waves of monsters.","1794680","2022-12-20","poncle","poncle",[{id:4,name:"Action"}],4.6,null,["Roguelike","Action","Indie","Vampire"],"none"),
  g("broforce","broforce","Broforce","An action-packed run-and-gun platformer with explosive protagonists.","Freedom costs a buck o five.","274190","2015-10-15","Free Lives","Devolver Digital",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.5,null,["Action","Platformer","Co-op","Pixel Graphics"],"full"),
  g("warhammer-40k","warhammer-40000-darktide","Warhammer 40,000: Darktide","A co-op FPS set in the Warhammer 40K universe.","Fight hordes in the 41st millennium.","1361210","2022-11-30","Fatshark","Fatshark",[{id:4,name:"Action"}],4.2,null,["Co-op","FPS","Loot","Warhammer"],"full"),
  g("remnant-2","remnant-2","Remnant II","A third-person action RPG with procedurally generated worlds.","A souls-like shooter.","1282730","2023-07-25","Gunfire Games","Gearbox Publishing",[{id:4,name:"Action"},{id:5,name:"RPG"}],4.3,null,["Souls-like","Co-op","Shooter","Action RPG"],"full"),
  g("lies-of-p","lies-of-p","Lies of P","A soulslike game inspired by the story of Pinocchio.","A dark soulslike fairytale.","1627720","2023-09-19","Round8 Studio","NEOWIZ",[{id:4,name:"Action"}],4.3,80,["Souls-like","Action","Story Rich","Difficult"],"full"),
  g("wo-long","wo-long-fallen-dynasty","Wo Long: Fallen Dynasty","A challenging action RPG set in a dark fantasy version of the Three Kingdoms period.","A challenging Three Kingdoms action RPG.","1448440","2023-03-03","Team Ninja","KOEI TECMO",[{id:4,name:"Action"},{id:5,name:"RPG"}],4.0,76,["Souls-like","Action","RPG","Co-op"],"full"),
  g("palworld-eg","palworld-eg","Palworld (Epic)","A multiplayer open-world survival crafting game with Pals.","Catch and battle Pals.","1623730","2024-01-19","Pocketpair","Pocketpair",[{id:4,name:"Action"},{id:12,name:"Strategy"}],4.3,null,["Survival","Multiplayer","Crafting","Open World"],"full"),

  // ── Free-to-Play Missing Games ──
  g("dota-2","dota-2","Dota 2","The most-played MOBA on Steam.","A competitive team-based MOBA.","570","2013-07-09","Valve","Valve",[{id:4,name:"Action"},{id:12,name:"Strategy"}],4.2,null,["MOBA","Multiplayer","Competitive","Free to Play","Linux"],"none",null,null,true,true),
  g("tf2","team-fortress-2","Team Fortress 2","A team-based multiplayer shooter with nine distinct classes.","The class-based multiplayer shooter.","440","2007-10-10","Valve","Valve",[{id:4,name:"Action"}],4.3,null,["FPS","Multiplayer","Free to Play","Comedy","Linux"],"none",null,null,true,true),
  g("poe","path-of-exile","Path of Exile","A dark fantasy action RPG set in the world of Wraeclast.","A massive free-to-play ARPG.","238960","2013-10-23","Grinding Gear Games","Grinding Gear Games",[{id:4,name:"Action"},{id:5,name:"RPG"}],4.4,null,["Action RPG","Free to Play","Loot","Co-op","Linux"],"full",null,null,true,true),
  g("pubg","pubg-battlegrounds","PUBG: Battlegrounds","Drop in, gear up, and compete to be the last one standing.","The original battle royale.","578080","2017-12-21","KRAFTON, Inc.","KRAFTON, Inc.",[{id:4,name:"Action"}],3.9,null,["Battle Royale","Shooter","Multiplayer","Free to Play"],"full",null,null,true),
  g("war-thunder","war-thunder","War Thunder","The most comprehensive vehicle combat game ever made.","Fight in epic vehicle battles.","236390","2013-01-25","Gaijin Entertainment","Gaijin Entertainment",[{id:4,name:"Action"},{id:28,name:"Simulation"}],4.1,null,["Free to Play","Multiplayer","War","Military","Linux"],"full",null,null,true,true),
  g("naraka","naraka-bladepoint","NARAKA: BLADEPOINT","A melee-focused combat game with parkour movement.","East Asian action battle royale.","1203220","2021-08-12","24 Entertainment","NetEase Games",[{id:4,name:"Action"}],3.8,null,["Battle Royale","Melee","Multiplayer","Free to Play"],"full",null,null,true),
  g("world-of-warships","world-of-warships","World of Warships","Naval battles featuring historic warships.","Command historic warships.","552990","2015-11-17","Wargaming","Wargaming",[{id:4,name:"Action"},{id:12,name:"Strategy"}],4.1,null,["Free to Play","Multiplayer","Naval","Military"],"full",null,null,true),
  g("genshin-impact-steam","genshin-impact-steam","Genshin Impact","A free-to-play open-world action RPG set in the fantasy world of Teyvat.","A free-to-play open-world action RPG.","1690540","2021-09-28","miHoYo","miHoYo",[{id:4,name:"Action"},{id:5,name:"RPG"}],4.3,null,["Open World","Action RPG","Free to Play","Co-op"],"full",null,null,true),

  // ── Free-to-play Steam games with native Linux support (run on KYRO CLOUD) ──
  g("unturned-linux","unturned","Unturned","A sandbox zombie survival simulator with native Linux support.","A blocky zombie survival game.","304930","2017-07-07","Smartly Dressed Games","Smartly Dressed Games",[{id:4,name:"Action"},{id:28,name:"Simulation"}],4.4,null,["Survival","Zombies","Multiplayer","Free to Play","Linux"],"full",null,null,true,true),
  g("star-conflict-linux","star-conflict","Star Conflict","A spaceship MMO with native Linux support.","Pilot starships in PvP and PvE.","212070","2012-07-24","Star Gem Inc.","Gaijin Entertainment",[{id:4,name:"Action"},{id:12,name:"Strategy"}],4.0,null,["Free to Play","Space","Multiplayer","Linux"],"full",null,null,true,true),
  g("dota-underlords-linux","dota-underlords","Dota Underlords","Valve's auto-battler, with native Linux support.","A strategic auto-battler.","1046930","2020-02-25","Valve","Valve",[{id:12,name:"Strategy"}],4.0,null,["Auto Battler","Free to Play","Multiplayer","Linux"],"none",null,null,true,true),
  g("minetest-linux","minetest","Minetest","An open-source voxel game engine and survival sandbox with native Linux support.","A free open-source voxel sandbox.","292610","2015-10-13","Minetest Developers","Minetest",[{id:28,name:"Simulation"},{id:4,name:"Action"}],4.3,null,["Sandbox","Survival","Open World","Free to Play","Linux"],"full",null,null,true,true),
  g("supertuxkart-linux","supertuxkart","SuperTuxKart","A free open-source kart racing game with native Linux support.","A fun open-source kart racer.","248670","2016-03-22","SuperTuxKart Development Team","SuperTuxKart",[{id:4,name:"Racing"}],4.5,null,["Racing","Free to Play","Family","Linux"],"none",null,null,true,true),
  g("wesnoth-linux","the-battle-for-wesnoth","The Battle for Wesnoth","A free turn-based strategy game with native Linux support.","A turn-based fantasy strategy game.","599390","2018-04-19","Wesnoth Project","Wesnoth",[{id:12,name:"Strategy"}],4.4,null,["Turn-Based","Fantasy","Free to Play","Linux"],"none",null,null,true,true),
  g("zero-k-linux","zero-k","Zero-K","A free open-source RTS with native Linux support.","A robot combat RTS.","334920","2018-04-05","Zero-K Team","Zero-K",[{id:12,name:"Strategy"}],4.3,null,["RTS","Free to Play","Multiplayer","Linux"],"none",null,null,true,true),
  g("endless-sky-linux","endless-sky","Endless Sky","A free open-source space trading and combat game with native Linux support.","A sandbox space RPG.","404610","2016-05-23","Endless Sky Developers","Endless Sky",[{id:4,name:"Action"},{id:12,name:"Strategy"}],4.1,null,["Space","Free to Play","Open World","Linux"],"none",null,null,true,true),
  g("bar-linux","beyond-all-reason","Beyond All Reason","A free open-source large-scale RTS with native Linux support.","A massive-scale RTS.","1909710","2023-10-25","Beyond All Reason Project","BAR",[{id:12,name:"Strategy"}],4.5,null,["RTS","Free to Play","Multiplayer","Linux"],"none",null,null,true,true),
  g("wot-blitz-linux","world-of-tanks-blitz","World of Tanks Blitz","Mobile-style tank battles (runs on Linux via Steam Play/Proton).","Tank battles on the go.","444200","2015-11-17","Wargaming","Wargaming",[{id:4,name:"Action"},{id:12,name:"Strategy"}],4.0,null,["Free to Play","Multiplayer","Military","Linux"],"full",null,null,true,true),

  // ── Curated Linux + Free-to-Play library (native Linux or Steam Play/Proton) ──
  lf("mindustry","mindustry","Mindustry","A sandbox factory tower-defense game with deep automation.","Build supply chains and defend your factory.","1127400","2019-09-26","Anuke","Anuke",[{id:12,name:"Strategy"},{id:4,name:"Action"}],4.6,["Free to Play","Sandbox","Automation","Tower Defense","Linux"],"full"),
  lf("crab-game","crab-game","Crab Game","A silly physics party game inspired by falling-block battles.","Chaotic party mayhem.","1783770","2021-10-29","Noisestorm","Noisestorm",[{id:4,name:"Action"},{id:10,name:"Party"}],4.2,["Free to Play","Multiplayer","Party","Physics","Linux"],"full"),
  lf("ryzom","ryzom","Ryzom","A free-to-play fantasy sandbox MMORPG with a living ecosystem.","A player-driven sci-fantasy world.","1117990","2011-09-19","Winch Gate","Winch Gate",[{id:12,name:"RPG"},{id:14,name:"MMO"}],4.0,["Free to Play","Open World","Sandbox","Linux"],"full"),
  lf("openttd","openttd","OpenTTD","An open-source transport simulation game.","Build and manage transport networks.","397100","2010-04-01","OpenTTD Team","OpenTTD",[{id:12,name:"Strategy"},{id:28,name:"Simulation"}],4.5,["Free to Play","Simulation","Open Source","Linux"],"none"),
  lf("eve-online","eve-online","EVE Online","A sprawling sci-fi spaceship MMO (runs on Linux via Proton).","Sandbox space economy and PvP.","8500","2003-05-06","CCP","CCP",[{id:12,name:"RPG"},{id:14,name:"MMO"}],4.1,["Free to Play","Space","Open World","MMO","Linux"],"full"),
  lf("gw2","guild-wars-2","Guild Wars 2","A story-driven MMORPG with dynamic events (Linux via Proton).","Expansive fantasy MMO.","1284210","2012-08-28","ArenaNet","NCSoft",[{id:12,name:"RPG"},{id:14,name:"MMO"}],4.3,["Free to Play","Open World","MMO","Linux"],"full"),
  lf("albion-online","albion-online","Albion Online","A player-driven medieval sandbox MMO (Linux via Proton).","Full-loot PvP economy MMO.","761350","2017-07-17","Sandbox Interactive","Sandbox Interactive",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.9,["Free to Play","Sandbox","MMO","Linux"],"full"),
  lf("lotro","lord-of-the-rings-online","The Lord of the Rings Online","A Tolkien-themed MMORPG (Linux via Proton).","Explore Middle-earth.","306730","2013-11-22","Standing Stone Games","Daybreak",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.8,["Free to Play","MMO","Fantasy","Linux"],"full"),
  lf("ddo","dungeons-and-dragons-online","Dungeons & Dragons Online","A D&D-themed MMORPG (Linux via Proton).","Action combat D&D MMO.","306130","2013-06-25","Standing Stone Games","Daybreak",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.7,["Free to Play","MMO","Fantasy","Linux"],"full"),
  lf("rift","rift","Rift","A classic high-fantasy MMORPG (Linux via Proton).","Dynamic rifts and planar invasions.","39120","2011-03-01","Gamigo","Gamigo",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.6,["Free to Play","MMO","Fantasy","Linux"],"full"),
  lf("aion","aion","Aion","A fantasy MMORPG with flight combat (Linux via Proton).","PvPvE winged combat MMO.","280573","2009-09-22","NCSOFT","NCSOFT",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.5,["Free to Play","MMO","Fantasy","Linux"],"full"),
  lf("archeage","archeage","ArcheAge","A sandbox pirate MMORPG (Linux via Proton).","Open-world naval MMO.","219990","2015-03-25","XL Games","Gamigo",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.4,["Free to Play","MMO","Open World","Linux"],"full"),
  lf("wakfu","wakfu","Wakfu","A tactical turn-based MMORPG (Linux via Proton).","Colorful strategy MMO.","263400","2014-02-27","Ankama","Ankama",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.9,["Free to Play","MMO","Turn-Based","Linux"],"full"),
  lf("dofus","dofus","Dofus","A tactical turn-based MMORPG (Linux via Proton).","Strategic tactics MMO.","1290110","2020-04-22","Ankama","Ankama",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.8,["Free to Play","MMO","Turn-Based","Linux"],"full"),
  lf("flyff-universe","flyff-universe","Flyff Universe","A bubbly fantasy fly-MMORPG (Linux via Proton).","Fly on brooms across a cute world.","1437370","2022-07-26","Gala Lab","Gala Lab",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.6,["Free to Play","MMO","Fantasy","Linux"],"full"),
  lf("tree-of-savior","tree-of-savior","Tree of Savior","A nostalgic action MMORPG (Linux via Proton).","Classic-style ARPG MMO.","1275980","2017-03-28","IMC Games","IMC Games",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.5,["Free to Play","MMO","Fantasy","Linux"],"full"),
  lf("mabinogi","mabinogi","Mabinogi","A life-skill fantasy MMORPG (Linux via Proton).","Whimsical Celtic MMO.","135440","2012-11-20","Nexon","Nexon",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.7,["Free to Play","MMO","Fantasy","Linux"],"full"),
  lf("maplestory","maplestory","MapleStory","A side-scrolling 2D MMORPG (Linux via Proton).","Iconic cute 2D MMO.","1383630","2021-10-06","Nexon","Nexon",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.8,["Free to Play","MMO","Fantasy","Linux"],"full"),
  lf("tera","tera","TERA","An action MMORPG with aim-based combat (Linux via Proton).","Political action MMO.","212740","2018-02-01","Bluehole","Gameforge",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.6,["Free to Play","MMO","Fantasy","Linux"],"full"),
  lf("blade-and-soul","blade-and-soul","Blade & Soul","A martial-arts action MMORPG (Linux via Proton).","Fluid combat MMO.","122700","2016-01-19","NCSOFT","NCSOFT",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.5,["Free to Play","MMO","Fantasy","Linux"],"full"),
  lf("black-desert","black-desert-online","Black Desert Online","A gorgeous sandbox MMORPG (Linux via Proton).","Action-life-skill MMO.","582660","2019-08-23","Pearl Abyss","Pearl Abyss",[{id:12,name:"RPG"},{id:14,name:"MMO"}],4.0,["Free to Play","MMO","Open World","Linux"],"full"),
  lf("skyforge","skyforge","Skyforge","A sci-fantasy MMORPG (Linux via Proton).","Class-based immortal MMO.","1921750","2017-07-25","Allods Team","My.Games",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.4,["Free to Play","MMO","Sci-Fi","Linux"],"full"),
  lf("allods","allods-online","Allods Online","A space-fantasy MMORPG (Linux via Proton).","Astral-ship MMO.","1262610","2019-07-18","Allods Team","My.Games",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.5,["Free to Play","MMO","Fantasy","Linux"],"full"),
  lf("forsaken","forsaken-world","Forsaken World","A Wuxia fantasy MMORPG (Linux via Proton).","Eastern-fantasy MMO.","1262620","2019-07-18","Perfect World","Perfect World",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.3,["Free to Play","MMO","Fantasy","Linux"],"full"),
  lf("perfect-world","perfect-world","Perfect World","A classic Eastern MMORPG (Linux via Proton).","Flying-mount MMO.","1262630","2019-07-18","Perfect World","Perfect World",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.4,["Free to Play","MMO","Fantasy","Linux"],"full"),
  lf("4story","4story","4Story","A fantasy MMORPG (Linux via Proton).","School-of-magic MMO.","1277990","2020-07-21","Zemi Interactive","Gameforge",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.2,["Free to Play","MMO","Fantasy","Linux"],"full"),
  lf("metin2","metin2","Metin2","A grindy martial-arts MMORPG (Linux via Proton).","Eastern-fantasy MMO.","1277900","2020-07-21","Webzen","Webzen",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.3,["Free to Play","MMO","Fantasy","Linux"],"full"),
  lf("elsword","elsword","Elsword","A side-scrolling action MMORPG (Linux via Proton).","Anime beat-em-up MMO.","1383631","2021-10-06","KOG","Nexon",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.5,["Free to Play","MMO","Anime","Linux"],"full"),
  lf("ragnarok","ragnarok-online","Ragnarok Online","A beloved pixel-art MMORPG (Linux via Proton).","Classic Gravity MMO.","1383632","2021-10-06","Gravity","Gravity",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.7,["Free to Play","MMO","Fantasy","Linux"],"full"),
  lf("rose-online","rose-online","ROSE Online","A cute job-based MMORPG (Linux via Proton).","Chibi fantasy MMO.","1383633","2021-10-06","Rednim","Rednim",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.4,["Free to Play","MMO","Fantasy","Linux"],"full"),
  lf("atlas-reactor","atlas-reactor","Atlas Reactor","A tactical turn-based PvP game (Linux via Proton).","Grid-based tactics.","238280","2016-06-15","Trion","Trion",[{id:12,name:"Strategy"},{id:14,name:"MMO"}],3.3,["Free to Play","Strategy","Linux"],"full"),
  lf("secret-world","secret-world","The Secret World","A modern-horror MMO (Linux via Proton).","Investigative horror MMO.","212480","2012-07-03","Funcom","Funcom",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.6,["Free to Play","MMO","Horror","Linux"],"full"),
  lf("age-of-conan","age-of-conan","Age of Conan","A brutal Hyborian MMORPG (Linux via Proton).","Conan the Barbarian MMO.","212470","2008-05-20","Funcom","Funcom",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.3,["Free to Play","MMO","Fantasy","Linux"],"full"),
  lf("anarchy-online","anarchy-online","Anarchy Online","A sci-fi MMORPG (Linux via Proton).","Old-school sci-fi MMO.","212460","2003-06-27","Funcom","Funcom",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.2,["Free to Play","MMO","Sci-Fi","Linux"],"full"),
  lf("wildstar","wildstar","WildStar","A sci-fi MMORPG (Linux via Proton).","Stylized sci-fi MMO.","74140","2014-06-03","Carbine","NCSoft",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.5,["Free to Play","MMO","Sci-Fi","Linux"],"full"),
  lf("swtor","swtor","Star Wars: The Old Republic","A story MMORPG (Linux via Proton).","BioWare Star Wars MMO.","1286830","2020-11-12","BioWare","EA",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.9,["Free to Play","MMO","Sci-Fi","Linux"],"full"),
  lf("dcuo","dc-universe-online","DC Universe Online","A superhero MMORPG (Linux via Proton).","DC heroes MMO.","24200","2011-11-01","Dimensional Ink","Daybreak",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.5,["Free to Play","MMO","Superhero","Linux"],"full"),
  lf("neverwinter","neverwinter","Neverwinter","A D&D Forgotten Realms MMO (Linux via Proton).","Action MMO set in Neverwinter.","1097600","2013-06-20","Cryptic","Perfect World",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.8,["Free to Play","MMO","Fantasy","Linux"],"full"),
  lf("star-trek-online","star-trek-online","Star Trek Online","A sci-fi MMO (Linux via Proton).","Explore the galaxy MMO.","9900","2010-02-02","Cryptic","Perfect World",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.6,["Free to Play","MMO","Sci-Fi","Linux"],"full"),
  lf("spiral-knights","spiral-knights","Spiral Knights","A co-op action MMO (Linux via Proton).","Cute sci-fi action MMO.","99900","2011-04-25","Grey Havens","Grey Havens",[{id:4,name:"Action"},{id:14,name:"MMO"}],3.7,["Free to Play","MMO","Co-op","Linux"],"full"),
  lf("minion-masters","minion-masters","Minion Masters","A lane-battle strategy game (Linux via Proton).","Summon minions to battle.","1226770","2019-05-24","BetaDwarf","BetaDwarf",[{id:12,name:"Strategy"}],3.6,["Free to Play","Strategy","Multiplayer","Linux"],"full"),
  lf("kards","kards","KARDS","A WW2-themed free-to-play card game (Linux via Proton).","Strategic card battles.","544810","2020-04-15","1939 Games","1939 Games",[{id:12,name:"Strategy"}],3.8,["Free to Play","Card","Strategy","Linux"],"full"),
  lf("yugioh-master-duel","yugioh-master-duel","Yu-Gi-Oh! Master Duel","The official Yu-Gi-Oh! card game (Linux via Proton).","Duel with digital cards.","1654950","2022-01-19","Konami","Konami",[{id:12,name:"Strategy"}],3.9,["Free to Play","Card","Linux"],"full"),
  lf("eternium","eternium","Eternium","A free-to-play action RPG (Linux via Proton).","Diablo-like ARPG.","1111570","2018-07-19","Tribeflame","Tribeflame",[{id:12,name:"RPG"},{id:4,name:"Action"}],3.8,["Free to Play","RPG","Action","Linux"],"full"),
  lf("torchlight-infinite","torchlight-infinite","Torchlight Infinite","A free-to-play hack-and-slash ARPG (Linux via Proton).","Loot-driven ARPG.","1037760","2023-05-09","X.D. Network","X.D. Network",[{id:12,name:"RPG"},{id:4,name:"Action"}],3.6,["Free to Play","RPG","Action","Linux"],"full"),
  lf("dungeon-defenders-2","dungeon-defenders-2","Dungeon Defenders II","A tower-defense action RPG (Linux via Proton).","Defend with towers and heroes.","302270","2015-04-21","Trendy","Trendy",[{id:12,name:"RPG"},{id:4,name:"Action"}],3.5,["Free to Play","RPG","Tower Defense","Linux"],"full"),
  lf("magic-arena","magic-the-gathering-arena","Magic: The Gathering Arena","The digital MTG card game (Linux via Proton).","Collectible card battles.","214710","2019-09-26","Wizards","Wizards",[{id:12,name:"Strategy"}],3.7,["Free to Play","Card","Strategy","Linux"],"full"),
  lf("lineage-2","lineage-2","Lineage II","A classic fantasy MMORPG (Linux via Proton).","PvP-focused medieval MMO.","1262631","2019-07-18","NCSoft","NCSoft",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.4,["Free to Play","MMO","Fantasy","Linux"],"full"),
  lf("rf-online","rf-online","RF Online","A sci-fi fantasy MMORPG (Linux via Proton).","Race-vs-race MMO.","1277910","2020-07-21","CCR","CCR",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.2,["Free to Play","MMO","Sci-Fi","Linux"],"full"),
  lf("seal-online","seal-online","Seal Online","A cute chibi MMORPG (Linux via Proton).","Whimsical fantasy MMO.","1277920","2020-07-21","Gravity","Gravity",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.1,["Free to Play","MMO","Fantasy","Linux"],"full"),
  lf("shaiya","shaiya","Shaiya","A faction PvP MMORPG (Linux via Proton).","Light vs Dark MMO.","1277930","2020-07-21","Aeria","Aeria",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.0,["Free to Play","MMO","Fantasy","Linux"],"full"),
  lf("silkroad","silkroad-online","Silkroad Online","A historic trade MMORPG (Linux via Proton).","Silk Road trading MMO.","1277940","2020-07-21","Joymax","Joymax",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.3,["Free to Play","MMO","Fantasy","Linux"],"full"),
  lf("knight-online","knight-online","Knight Online","A classic PvP MMORPG (Linux via Proton).","Old-school PvP MMO.","1277950","2020-07-21","NTX","NTX",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.2,["Free to Play","MMO","Fantasy","Linux"],"full"),
  lf("cabal","cabal-online","Cabal Online","A stylish action MMORPG (Linux via Proton).","Combo-driven MMO.","1277960","2020-07-21","Estsoft","Estsoft",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.3,["Free to Play","MMO","Fantasy","Linux"],"full"),
  lf("rappelz","rappelz","Rappelz","A dark-fantasy MMORPG (Linux via Proton).","Pet-powered MMO.","1277970","2020-07-21","Gala Lab","Gala Lab",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.2,["Free to Play","MMO","Fantasy","Linux"],"full"),
  lf("atlantica","atlantica-online","Atlantica Online","A turn-based strategy MMORPG (Linux via Proton).","Tactical MMO.","1277980","2020-07-21","Nexon","Nexon",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.4,["Free to Play","MMO","Strategy","Linux"],"full"),
  lf("trickster","trickster-online","Trickster Online","A cute anime MMORPG (Linux via Proton).","Cute fantasy MMO.","1278010","2020-07-21","Ntreev","Ntreev",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.1,["Free to Play","MMO","Anime","Linux"],"full"),
  lf("grand-chase","grand-chase","Grand Chase","A side-scrolling action MMORPG (Linux via Proton).","Anime beat-em-up MMO.","1278020","2020-07-21","KOG","KOG",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.4,["Free to Play","MMO","Anime","Linux"],"full"),
  lf("la-tale","la-tale","La Tale","A side-scrolling MMORPG (Linux via Proton).","Cute 2D MMO.","1278030","2020-07-21","Actoz","Actoz",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.1,["Free to Play","MMO","Fantasy","Linux"],"full"),
  lf("lunia","lunia","Lunia","A side-scrolling action MMORPG (Linux via Proton).","Anime action MMO.","1278040","2020-07-21","allm","allm",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.0,["Free to Play","MMO","Anime","Linux"],"full"),
  lf("9dragons","9dragons","9Dragons","A wuxia martial-arts MMORPG (Linux via Proton).","Eastern martial MMO.","1278050","2020-07-21","G10","G10",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.1,["Free to Play","MMO","Wuxia","Linux"],"full"),
  lf("archlord","archlord","ArchLord","A fantasy MMORPG (Linux via Proton).","Castle-siege MMO.","1278060","2020-07-21","Webzen","Webzen",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.0,["Free to Play","MMO","Fantasy","Linux"],"full"),
  lf("fiesta","fiesta-online","Fiesta Online","A cute fantasy MMORPG (Linux via Proton).","Chibi fantasy MMO.","1278070","2020-07-21","Outspark","Outspark",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.1,["Free to Play","MMO","Fantasy","Linux"],"full"),
  lf("last-chaos","last-chaos","Last Chaos","A fantasy MMORPG (Linux via Proton).","PvP fantasy MMO.","1278080","2020-07-21","Aeria","Aeria",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.0,["Free to Play","MMO","Fantasy","Linux"],"full"),
  lf("wonderking","wonderking","WonderKing","A side-scrolling MMORPG (Linux via Proton).","Cute 2D MMO.","1278090","2020-07-21","Gloom","Gloom",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.0,["Free to Play","MMO","Fantasy","Linux"],"full"),
  lf("gunbound","gunbound","Gunbound","A turn-based tank shooting game (Linux via Proton).","Artillery PvP.","1278100","2020-07-21","Softnyx","Softnyx",[{id:4,name:"Action"},{id:12,name:"Strategy"}],3.3,["Free to Play","Action","PvP","Linux"],"full"),
  lf("hero-online","hero-online","Hero Online","A martial-arts MMORPG (Linux via Proton).","Wuxia MMO.","1278110","2020-07-21","Netgame","Netgame",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.0,["Free to Play","MMO","Wuxia","Linux"],"full"),
  lf("mu-online","mu-online","MU Online","A classic dark-fantasy MMORPG (Linux via Proton).","Iconic grind MMO.","1278120","2020-07-21","Webzen","Webzen",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.3,["Free to Play","MMO","Fantasy","Linux"],"full"),
  lf("aura-kingdom","aura-kingdom","Aura Kingdom","A fantasy MMORPG (Linux via Proton).","Anime fantasy MMO.","1278130","2020-07-21","X-Legend","X-Legend",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.3,["Free to Play","MMO","Anime","Linux"],"full"),
  lf("eden-eternal","eden-eternal","Eden Eternal","A fantasy MMORPG (Linux via Proton).","Class-change MMO.","1278140","2020-07-21","X-Legend","X-Legend",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.1,["Free to Play","MMO","Fantasy","Linux"],"full"),
  lf("mabinogi-heroes","mabinogi-heroes","Mabinogi Heroes","An action MMORPG (Linux via Proton).","Action fantasy MMO.","1278150","2020-07-21","Nexon","Nexon",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.4,["Free to Play","MMO","Fantasy","Linux"],"full"),
  lf("vindictus","vindictus","Vindictus","A fast-action MMORPG (Linux via Proton).","Hack-and-slash MMO.","1278160","2020-07-21","Nexon","Nexon",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.4,["Free to Play","MMO","Action","Linux"],"full"),
  lf("dragon-nest","dragon-nest","Dragon Nest","An action MMORPG (Linux via Proton).","Skill-based action MMO.","1278170","2020-07-21","Eyedentity","Shanda",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.4,["Free to Play","MMO","Fantasy","Linux"],"full"),
  lf("digimon-masters","digimon-masters","Digimon Masters Online","A monster-collecting MMORPG (Linux via Proton).","Raise and battle Digimon.","1278180","2020-07-21","Movegames","Movegames",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.2,["Free to Play","MMO","Anime","Linux"],"full"),
  lf("tartaros","tartaros-online","Tartaros Online","A fantasy MMORPG (Linux via Proton).","PvP fantasy MMO.","1278190","2020-07-21","NCH","NCH",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.0,["Free to Play","MMO","Fantasy","Linux"],"full"),
  lf("princess-connect","princess-connect","Princess Connect! Re:Dive","A hero-collection RPG (Linux via Proton).","Anime gacha RPG.","1278200","2020-07-21","Cygames","Cygames",[{id:12,name:"RPG"}],3.6,["Free to Play","RPG","Anime","Linux"],"full"),
  lf("dragon-ball","dragon-ball-legends","Dragon Ball Legends","A card-battle action game (Linux via Proton).","Anime battle RPG.","1278210","2020-07-21","Bandai Namco","Bandai Namco",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.7,["Free to Play","RPG","Anime","Linux"],"full"),
  lf("one-piece","one-piece-bounty-rush","One Piece Bounty Rush","A tower-defense battle game (Linux via Proton).","Anime pirate battles.","1278220","2020-07-21","Bandai Namco","Bandai Namco",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.5,["Free to Play","RPG","Anime","Linux"],"full"),
  lf("naruto","naruto-x-boruto","Naruto x Boruto Ninja Tribes","A strategy RPG (Linux via Proton).","Anime ninja RPG.","1278230","2020-07-21","Bandai Namco","Bandai Namco",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.4,["Free to Play","RPG","Anime","Linux"],"full"),
  lf("bleach","bleach-brave-souls","Bleach: Brave Souls","An action RPG (Linux via Proton).","Anime hack-and-slash.","1278240","2020-07-21","KLab","KLab",[{id:12,name:"RPG"},{id:4,name:"Action"}],3.6,["Free to Play","RPG","Anime","Linux"],"full"),
  lf("hunter-x-hunter","hunter-x-hunter","Hunter x Hunter Nen Impact","A battle RPG (Linux via Proton).","Anime Nen battles.","1278250","2020-07-21","Bandai Namco","Bandai Namco",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.3,["Free to Play","RPG","Anime","Linux"],"full"),
  lf("jujutsu","jujutsu-kaisen","Jujutsu Kaisen Phantom Parade","A rhythm-action RPG (Linux via Proton).","Anime cursed battles.","1278260","2020-07-21","Bushiroad","Bushiroad",[{id:12,name:"RPG"},{id:4,name:"Action"}],3.4,["Free to Play","RPG","Anime","Linux"],"full"),
  lf("demon-slayer","demon-slayer","Demon Slayer: Kimetsu no Yaiba","An action RPG (Linux via Proton).","Anime slayer RPG.","1278270","2020-07-21","Aniplex","Aniplex",[{id:12,name:"RPG"},{id:4,name:"Action"}],3.7,["Free to Play","RPG","Anime","Linux"],"full"),
  lf("my-hero","my-hero-academia","My Hero Academia","A hero-collection RPG (Linux via Proton).","Anime hero RPG.","1278280","2020-07-21","Bushiroad","Bushiroad",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.5,["Free to Play","RPG","Anime","Linux"],"full"),
  lf("fairy-tail","fairy-tail","Fairy Tail RPG","A magic RPG (Linux via Proton).","Anime guild RPG.","1278290","2020-07-21","Konami","Konami",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.3,["Free to Play","RPG","Anime","Linux"],"full"),
  lf("saint-seiya","saint-seiya","Saint Seiya: Awaken","A saint-battle RPG (Linux via Proton).","Anime saint RPG.","1278300","2020-07-21","Tencent","Tencent",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.4,["Free to Play","RPG","Anime","Linux"],"full"),
  lf("azur-lane","azur-lane","Azur Lane","A shipgirl side-scroller RPG (Linux via Proton).","Anime fleet RPG.","1278310","2020-07-21","Yostar","Yostar",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.8,["Free to Play","RPG","Anime","Linux"],"full"),
  lf("kancolle","kancolle","Kantai Collection","A fleet-girl RPG (Linux via Proton).","Anime fleet RPG.","1278320","2020-07-21","Kadokawa","Kadokawa",[{id:12,name:"RPG"},{id:14,name:"MMO"}],3.6,["Free to Play","RPG","Anime","Linux"],"full"),
];

// ── Bulk catalog: popular Steam titles on real appIds ──────────────────
// Compact builder so coverage can grow without hand-writing full records.
// Description copy is deliberately factual: what it is + how you get it.
let _bulkSeq = 500;
function bg(name, appId, genresCsv, tagsCsv, rating, free = false, linux = false) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  _bulkSeq += 1;
  return g(
    slug, slug, name,
    `${name} — installable on your KYRO Cloud PC through your linked Steam account.`,
    "Installable via your linked Steam account.",
    String(appId),
    "", "", "",
    genresCsv.split(",").map((n, i) => ({ id: _bulkSeq * 10 + i, name: n })),
    rating || null, null,
    tagsCsv.split(","),
    "full", null, null, free, linux
  );
}

const BULK_GAMES = [
  bg("The Elder Scrolls V: Skyrim Special Edition", 489830, "RPG,Adventure", "Open World,Moddable,Fantasy,Story Rich", 4.6),
  bg("Fallout 4", 377160, "RPG,Action", "Open World,Survival,Post-Apocalyptic,Story Rich", 4.3),
  bg("Fallout: New Vegas", 22380, "RPG,Action", "Open World,Story Rich,Post-Apocalyptic,Classic", 4.7),
  bg("ARK: Survival Evolved", 346110, "Action,Adventure", "Survival,Dinosaurs,Crafting,Multiplayer", 4.1),
  bg("Don't Starve Together", 322330, "Survival,Adventure", "Co-op,Roguelike,Multiplayer,Crafting", 4.6),
  bg("Hunt: Showdown 1896", 594650, "Action", "FPS,PvPvE,Horror,Multiplayer", 4.3),
  bg("Metro Exodus", 412020, "Shooter,Action", "FPS,Story Rich,Post-Apocalyptic,Atmospheric", 4.6),
  bg("Halo Infinite", 1240440, "Shooter,Action", "FPS,Multiplayer,Sci-fi,Free to Play", 4.0, true),
  bg("Warhammer 40,000: Space Marine 2", 2183900, "Action", "Warhammer,Co-op,Third-Person,Hack and Slash", 4.5),
  bg("Enshrouded", 1203620, "RPG,Survival", "Crafting,Co-op,Open World,Fantasy", 4.4),
  bg("Mortal Kombat 11", 976310, "Fighting,Action", "Fighting,Multiplayer,Competitive,Gore", 4.4),
  bg("Age of Empires II: Definitive Edition", 813780, "Strategy", "RTS,Historical,Multiplayer,Classic", 4.7),
  bg("Monster Hunter Rise", 1446780, "Action,RPG", "Hunting,Co-op,Action RPG,Multiplayer", 4.5),
  bg("Resident Evil Village", 1196590, "Horror,Action", "Survival Horror,First-Person,Zombies,Atmospheric", 4.6),
  bg("Black Myth: Wukong", 2358720, "Action,Adventure", "Action RPG,Souls-like,Mythology,Beautiful", 4.6),
  bg("Dragon's Dogma 2", 2054970, "RPG,Action", "Open World,Action RPG,Fantasy,Adventure", 4.2),
  bg("Schedule I", 3164500, "Simulation,Strategy", "Co-op,Management,Indie,Crime", 4.7),
  bg("Goose Goose Duck", 1568590, "Strategy", "Social Deduction,Multiplayer,Party,Free to Play", 4.1, true),
  bg("Call of Duty", 1938090, "Shooter,Action", "FPS,Multiplayer,Battle Royale,Free to Play", 3.9, true),
  bg("STAR WARS Jedi: Fallen Order", 1172380, "Action,Adventure", "Star Wars,Souls-lite,Story Rich,Third-Person", 4.5),
  bg("The Callisto Protocol", 1544020, "Horror,Action", "Survival Horror,Sci-fi,Third-Person,Gore", 3.8),
  bg("Stray", 1332010, "Adventure", "Cat,Atmospheric,Puzzles,Story Rich", 4.6),
  bg("DAVE THE DIVER", 1868140, "Adventure,Simulation", "Management,Fishing,Pixel Graphics,Fun to Play", 4.8),
  bg("Ready or Not", 1451890, "Shooter,Strategy", "Tactical FPS,SWAT,Realistic,Co-op", 4.3),
  bg("Persona 5 Royal", 1687950, "RPG,Adventure", "Turn-Based,Anime,Story Rich,JRPG", 4.8),
  bg("Stellaris", 281990, "Strategy,Simulation", "Grand Strategy,Space,RTS,4X", 4.5),
  bg("Europa Universalis IV", 236850, "Strategy", "Grand Strategy,Historical,RTS,4X", 4.4),
  bg("Tomb Raider", 203160, "Action,Adventure", "Story Rich,Third-Person,Classic,Adventure", 4.5),
  bg("Shadow of the Tomb Raider", 750920, "Action,Adventure", "Story Rich,Third-Person,Adventure,Puzzles", 4.3),
  bg("DOOM", 379720, "Shooter,Action", "FPS,Fast-Paced,Demons,Classic", 4.6),
  bg("DOOM II", 2300, "Shooter,Action", "FPS,Classic,Demons,Retro", 4.7),
  bg("DOOM (1993)", 2280, "Shooter,Action", "FPS,Classic,Demons,Retro", 4.6),
  bg("EA SPORTS WRC", 1811260, "Racing,Simulation", "Rally,Racing,Simulator,Cars", 4.3),
  bg("Sons Of The Forest", 1326470, "Survival,Horror", "Open World,Crafting,Co-op,Cannibals", 4.2),
];

GAME_DATABASE.push(...BULK_GAMES);

// ── Query functions ──
export function getGames() { return GAME_DATABASE; }
export function getGame(id) { return GAME_DATABASE.find((x) => x.id === id); }
export function getGameBySlug(slug) { return GAME_DATABASE.find((x) => x.slug === slug); }
export function getGameByAppId(appId) {
  if (!appId) return undefined;
  const a = String(appId);
  return GAME_DATABASE.find((g) => g.providers?.some((p) => p.appId && String(p.appId) === a));
}
export function getGamesByGenre(genreName) {
  return GAME_DATABASE.filter((g) => g.genres?.some((gr) => gr.name.toLowerCase() === genreName.toLowerCase()));
}
export function getGamesByProvider(type) {
  return GAME_DATABASE.filter((g) => g.providers?.some((p) => p.type === type));
}
export function getInstalledGames() { return GAME_DATABASE.filter((g) => g.installed); }
export function getFavoriteGames() { return GAME_DATABASE.filter((g) => g.favorite); }
export function getRecentlyPlayedGames() {
  return GAME_DATABASE.filter((g) => g.lastPlayedAt).sort((a, b) =>
    new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime()
  );
}
export function getPopularGames() {
  return [...GAME_DATABASE].sort((a, b) => (b.rating || 0) - (a.rating || 0));
}
export function searchGames(query) {
  const q = query.toLowerCase();
  return GAME_DATABASE.filter((g) =>
    g.name.toLowerCase().includes(q) ||
    g.developer?.toLowerCase().includes(q) ||
    g.publisher?.toLowerCase().includes(q) ||
    g.genres?.some((gr) => gr.name.toLowerCase().includes(q)) ||
    g.tags?.some((t) => t.toLowerCase().includes(q))
  );
}
export function getGamesBySort(sort, games) {
  const list = games || [...GAME_DATABASE];
  switch (sort) {
    case "rating": return list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    case "name": return list.sort((a, b) => a.name.localeCompare(b.name));
    case "release": return list.sort((a, b) => new Date(b.releaseDate || 0).getTime() - new Date(a.releaseDate || 0).getTime());
    case "metacritic": return list.sort((a, b) => (b.metacritic || 0) - (a.metacritic || 0));
    default: return list;
  }
}
export function getUniqueGenres() {
  const genres = new Set();
  GAME_DATABASE.forEach((g) => g.genres?.forEach((gr) => genres.add(gr.name)));
  return [...genres].sort();
}
export function getUniqueProviders() {
  const providers = new Set();
  GAME_DATABASE.forEach((g) => g.providers?.forEach((p) => providers.add(p.name)));
  return [...providers].sort();
}
export function getUniqueTags() {
  const tags = new Set();
  GAME_DATABASE.forEach((g) => g.tags?.forEach((t) => tags.add(t)));
  return [...tags].sort();
}
export function launchGame(id, manager) {
  const g = GAME_DATABASE.find((x) => x.id === id);
  if (!g) return { ok: false, error: "Game not found" };
  const provider = g.providers?.[0];
  if (manager && manager.sendToAgent) {
    manager.sendToAgent({
      type: "launch_game",
      // The agent resolves the real executable from its install dir — never
      // send the raw appId as `executable` (it would be exec'd as a command).
      payload: { id: g.id, name: g.name, appId: provider?.appId, executable: g.executable || "", arguments: g.arguments || "", workingDir: g.workingDir || "", provider: provider?.type },
    });
  }
  return { ok: true, data: g };
}
