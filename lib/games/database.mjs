// KYRO CLOUD — Game Database
// Real game metadata with Steam CDN artwork

function sc(appId) {
  return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;
}

function sh(appId) {
  return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/page_bg_generated_v6b.jpg`;
}

// Screenshots are fetched live from Steam API — never generate fake URLs
function ss() {
  return [];
}

function g(id, slug, name, desc, short, appId, release, dev, pub, genres, rating, mc, tags, ctrl = "full", size = null, reqs = null) {
  return {
    id, slug, name, description: desc, shortDescription: short,
    coverImage: appId ? sc(appId) : null,
    heroImage: appId ? sh(appId) : null,
    screenshots: [],
    releaseDate: release, developer: dev, publisher: pub,
    genres, rating, metacritic: mc, platforms: ["PC"],
    providers: appId ? [{ id: `steam-${id}`, type: "steam", name: "Steam", appId, launchMethod: "steam", availability: "available" }] : [],
    availability: "available", installed: false, favorite: false,
    lastPlayedAt: null, playTime: 0, running: false,
    compatibility: "SUPPORTED", tags, controllerSupport: ctrl,
    downloadSize: size, systemRequirements: reqs,
  };
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

function eg(id, slug, name, desc, short, steamAppId, release, dev, pub, genres, rating, mc, tags, ctrl = "full") {
  // Use Steam CDN artwork if Steam app ID available, else null (shows gradient fallback)
  const cover = steamAppId ? sc(steamAppId) : null;
  const hero = steamAppId ? sh(steamAppId) : null;
  return {
    id, slug, name, description: desc, shortDescription: short,
    coverImage: cover, heroImage: hero, screenshots: [],
    releaseDate: release, developer: dev, publisher: pub,
    genres, rating, metacritic: mc, platforms: ["PC"],
    providers: [{ id: `epic-${id}`, type: "steam", name: "Epic Games", appId: steamAppId || null, launchMethod: "epic", availability: "available" }],
    availability: "available", installed: false, favorite: false,
    lastPlayedAt: null, playTime: 0, running: false,
    compatibility: "SUPPORTED", tags, controllerSupport: ctrl,
  };
}

function gg(id, slug, name, desc, short, steamAppId, release, dev, pub, genres, rating, mc, tags, ctrl = "full") {
  const cover = steamAppId ? sc(steamAppId) : null;
  const hero = steamAppId ? sh(steamAppId) : null;
  return {
    id, slug, name, description: desc, shortDescription: short,
    coverImage: cover, heroImage: hero, screenshots: [],
    releaseDate: release, developer: dev, publisher: pub,
    genres, rating, metacritic: mc, platforms: ["PC"],
    providers: [{ id: `gog-${id}`, type: "steam", name: "GOG", launchMethod: "gog", availability: "available" }],
    availability: "available", installed: false, favorite: false,
    lastPlayedAt: null, playTime: 0, running: false,
    compatibility: "SUPPORTED", tags, controllerSupport: ctrl,
  };
}

function ub(id, slug, name, desc, short, release, dev, pub, genres, rating, mc, tags, ctrl = "full") {
  return {
    id, slug, name, description: desc, shortDescription: short,
    coverImage: null, heroImage: null, screenshots: [],
    releaseDate: release, developer: dev, publisher: pub,
    genres, rating, metacritic: mc, platforms: ["PC"],
    providers: [{ id: `ubisoft-${id}`, type: "steam", name: "Ubisoft Connect", launchMethod: "ubisoft", availability: "available" }],
    availability: "available", installed: false, favorite: false,
    lastPlayedAt: null, playTime: 0, running: false,
    compatibility: "SUPPORTED", tags, controllerSupport: ctrl,
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
  g("cs2","counter-strike-2","Counter-Strike 2","The next evolution of competitive FPS.","The next evolution of competitive FPS.","730","2023-09-27","Valve","Valve",[{id:4,name:"Action"}],4.3,83,["FPS","Competitive","Multiplayer","Tactical"],"none","30 GB"),
  g("apex-legends","apex-legends","Apex Legends","Join legends from the edges of the Frontier in a battle royale shooter.","A battle royale shooter with unique Legends.","1172470","2019-02-04","Respawn Entertainment","Electronic Arts",[{id:4,name:"Action"}],4.1,null,["Battle Royale","FPS","Multiplayer","Free to Play"],"full","60 GB"),
  g("overwatch-2","overwatch-2","Overwatch 2","The world needs heroes. An always-on, ever-evolving free-to-play team-based game.","A free-to-play team-based shooter.","2357570","2022-10-04","Blizzard Entertainment","Blizzard Entertainment",[{id:4,name:"Action"}],3.9,null,["FPS","Multiplayer","Hero Shooter","Free to Play"],"full","50 GB"),
  g("destiny-2","destiny-2","Destiny 2","Explore the mysteries of the solar system and the powers within.","An online multiplayer shooter with RPG elements.","1085660","2019-10-01","Bungie","Bungie",[{id:4,name:"Action"},{id:5,name:"RPG"}],4.0,null,["FPS","Loot","Multiplayer","Co-op"],"full","105 GB"),
  g("doom-eternal","doom-eternal","DOOM Eternal","The direct sequel to the award-winning DOOM (2016). The ultimate combination of speed and power.","The ultimate fast-paced FPS.","782330","2020-03-20","id Software","Bethesda Softworks",[{id:4,name:"Action"}],4.6,89,["FPS","Action","Demons","Fast-Paced"],"full","40 GB"),
  g("helldivers-2","helldivers-2","Helldivers 2","The galaxy needs super earth's finest. Fight for freedom in this intense co-op shooter.","An intense co-op third-person shooter.","553850","2024-02-08","Arrowhead Game Studios","PlayStation Publishing LLC",[{id:4,name:"Action"}],4.4,82,["Co-op","Shooter","Action","Multiplayer"],"full","100 GB"),
  g("valorant","valorant","VALORANT","A 5v5 character-based tactical FPS where precise gunplay meets unique agent abilities.","A character-based tactical FPS.",null,"2020-06-02","Riot Games","Riot Games",[{id:4,name:"Action"}],4.2,null,["FPS","Competitive","Multiplayer","Tactical"],"none","30 GB"),
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
  g("rocket-league","rocket-league","Rocket League","A high-powered hybrid of arcade-style soccer and vehicular mayhem.","A high-powered soccer meets mayhem.","252950","2015-07-07","Psyonix","Psyonix",[{id:4,name:"Action"},{id:28,name:"Simulation"}],4.5,null,["Sports","Multiplayer","Competitive","Cars"]),
  g("fall-guys","fall-guys","Fall Guys","Dive into ridiculous challenges and mutating obstacle courses with up to 60 players.","A massive multiplayer party game.","1097150","2020-08-04","Mediatonic","Devolver Digital",[{id:4,name:"Action"}],4.0,null,["Party","Multiplayer","Competitive","Free to Play"]),
  g("among-us","among-us","Among Us","Play online with 4-15 players. Try to hold your spaceship together — but beware the impostor.","A game of teamwork and betrayal.","945360","2018-06-15","Innersloth","Innersloth",[{id:4,name:"Action"},{id:12,name:"Strategy"}],4.1,null,["Multiplayer","Social Deduction","Party","Free to Play"]),
  g("lethal-company","lethal-company","Lethal Company","A co-op horror game where you and your friends collect scrap from abandoned moons.","A co-op horror game about collecting scrap.","2243720","2023-10-23","Zeekerss","Zeekerss",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.5,null,["Horror","Co-op","Multiplayer","Indie"],"none"),
  g("drg","deep-rock-galactic","Deep Rock Galactic","1-4 player co-op FPS featuring badass space Dwarves and 100% destructible environments.","A co-op FPS with space Dwarves.","548430","2018-05-18","Ghost Ship Games","Coffee Stain Publishing",[{id:4,name:"Action"}],4.7,85,["Co-op","FPS","Multiplayer","Mining"]),
  g("l4d2","left-4-dead-2","Left 4 Dead 2","Challenge you and your friends through a zombie apocalypse across five campaigns.","A zombie apocalypse co-op shooter.","550","2009-11-17","Valve","Valve",[{id:4,name:"Action"}],4.6,null,["Co-op","Zombies","FPS","Multiplayer"]),

  // ── Narrative / Adventure ──
  g("lis","life-is-strange","Life is Strange","A five-part episodic adventure game. Max Caulfield discovers she can rewind time.","A five-part episodic adventure.","319630","2015-01-30","DONTNOD Entertainment","SQUARE ENIX",[{id:31,name:"Adventure"}],4.4,null,["Story Rich","Choices Matter","Adventure","Narrative"]),
  g("firewatch","firewatch","Firewatch","A single-player first-person mystery set in the Wyoming wilderness.","A first-person mystery set in the wilderness.","383870","2016-02-09","Campo Santo","Campo Santo",[{id:31,name:"Adventure"}],4.3,null,["Story Rich","Walking Simulator","Mystery","Atmospheric"]),
  g("edith-finch","what-remains-of-edith-finch","What Remains of Edith Finch","A collection of short stories about a cursed family in Washington state.","A collection of short stories.","501300","2017-08-02","Giant Sparrow","Annapurna Interactive",[{id:31,name:"Adventure"}],4.5,89,["Story Rich","Walking Simulator","Narrative","Artistic"]),

  // ── More AAA / Recent ──
  g("elden-ring-dlc","elden-ring-shadow-of-the-erdtree","ELDEN RING Shadow of the Erdtree","The massive expansion for ELDEN RING. A new story, new areas, new challenges.","The massive expansion for ELDEN RING.","2784050","2024-06-21","FromSoftware Inc.","Bandai Namco Entertainment",[{id:4,name:"Action"},{id:5,name:"RPG"}],4.6,94,["Souls-like","Open World","DLC","Fantasy"]),
  g("cp2077-ult","cyberpunk-2077-ultimate-edition","Cyberpunk 2077: Ultimate Edition","The complete Cyberpunk 2077 experience including base game and Phantom Liberty.","The complete Cyberpunk 2077 experience.","2889970","2023-09-26","CD PROJEKT RED","CD PROJEKT",[{id:4,name:"Action"},{id:5,name:"RPG"}],4.5,null,["Open World","Cyberpunk","Story Rich","RPG"]),
  g("anno-1800","anno-1800","Anno 1800","Lead the industrial revolution in this city builder and strategy game.","A city builder set in the industrial age.","576500","2019-04-16","Blue Byte","Ubisoft",[{id:12,name:"Strategy"},{id:28,name:"Simulation"}],4.3,82,["City Builder","Strategy","Simulation","Historical"]),

  // ── More indie / popular ──
  g("it-takes-two","it-takes-two","It Takes Two","A cooperative action-adventure. Play as Cody and May, a couple turned into dolls.","A cooperative action-adventure.","1426210","2021-03-26","Hazelight Studios","Electronic Arts",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.7,88,["Co-op","Story Rich","Adventure","Platformer"]),
  g("hogwarts-legacy-2","hogwarts-legacy-2","Hogwarts Legacy 2","The sequel to the open-world action RPG set in the Wizarding World.","The sequel to Hogwarts Legacy.",null,"2025-01-01","Avalanche Software","Warner Bros. Games",[{id:4,name:"Action"},{id:5,name:"RPG"},{id:31,name:"Adventure"}],null,null,["Open World","Magic","Fantasy","RPG"]),
  g("gta-vi","grand-theft-auto-vi","Grand Theft Auto VI","The next installment in the Grand Theft Auto series.","The next GTA.",null,"2025-10-01","Rockstar North","Rockstar Games",[{id:4,name:"Action"},{id:31,name:"Adventure"}],null,null,["Open World","Crime","Action","Multiplayer"]),
  g("fable","fable","Fable","A new beginning for the beloved action RPG franchise.","The return of Fable.",null,"2025-01-01","Playground Games","Xbox Game Studios",[{id:4,name:"Action"},{id:5,name:"RPG"},{id:31,name:"Adventure"}],null,null,["RPG","Open World","Fantasy","Action"]),
  g("avowed","avowed","Avowed","A first-person fantasy RPG set in the world of Eora from Obsidian Entertainment.","A first-person fantasy RPG.",null,"2025-02-18","Obsidian Entertainment","Xbox Game Studios",[{id:4,name:"Action"},{id:5,name:"RPG"}],null,null,["RPG","Fantasy","First-Person","Adventure"]),
  g("doom-the-dark-ages","doom-the-dark-ages","DOOM: The Dark Ages","The prequel to DOOM (2016) and DOOM Eternal. A dark fantasy sci-fi action FPS.","A dark fantasy sci-fi action FPS.",null,"2025-05-15","id Software","Bethesda Softworks",[{id:4,name:"Action"}],null,null,["FPS","Action","Dark Fantasy","Demons"]),

  // ── Epic Games Store Exclusives ──
  eg("fortnite","fortnite","Fortnite","The free-to-play, ever-evolving multiplayer game.","The biggest battle royale in the world.",null,"2017-07-25","Epic Games","Epic Games",[{id:4,name:"Action"}],4.0,null,["Battle Royale","Shooter","Free to Play","Building"],"full"),
  eg("rocket-league-eg","rocket-league-eg","Rocket League","A high-powered hybrid of arcade-style soccer and vehicular mayhem.","Soccer meets rocket-powered cars.","252950","2015-07-07","Psyonix","Epic Games",[{id:4,name:"Action"},{id:28,name:"Simulation"}],4.5,null,["Sports","Multiplayer","Competitive","Cars"],"full"),
  eg("fall-guys-eg","fall-guys-eg","Fall Guys","Dive into ridiculous challenges and mutating obstacle courses with up to 60 players.","A massive multiplayer party game.","1097150","2020-08-04","Mediatonic","Epic Games",[{id:4,name:"Action"}],4.0,null,["Party","Multiplayer","Competitive","Free to Play"],"full"),
  eg("genshin-impact","genshin-impact","Genshin Impact","A free-to-play open-world action RPG set in the fantasy world of Teyvat.","A free-to-play open-world action RPG.",null,"2020-09-28","miHoYo","miHoYo",[{id:4,name:"Action"},{id:5,name:"RPG"}],4.3,null,["Open World","Action RPG","Free to Play","Co-op"],"full"),
  eg("the-finals","the-finals","THE FINALS","A free-to-play, team-based FPS with destructible environments.","Destructible environments in a team-based FPS.",null,"2023-12-07","Embark Studios","Embark Studios",[{id:4,name:"Action"}],4.1,null,["FPS","Multiplayer","Destruction","Free to Play"],"none"),
  eg("rumbleverse","rumbleverse","Rumbleverse","A free-to-play 40-player brawler battle royale.","A brawler battle royale.",null,"2022-08-11","Iron Galaxy","Epic Games",[{id:4,name:"Action"}],3.8,null,["Battle Royale","Fighting","Free to Play","Multiplayer"],"full"),
  eg("satisfactory","satisfactory","Satisfactory","An open-world factory-building game.","A 3D factory-building game.","526900","2024-09-10","Coffee Stain Studios","Coffee Stain Publishing",[{id:12,name:"Strategy"},{id:28,name:"Simulation"}],4.7,null,["Automation","Building","Co-op","Base Building"],"none"),
  eg("saints-row-eg","saints-row-eg","Saints Row","The reboot of the beloved open-world crime saga.","The iconic open-world crime saga reborn.","742420","2022-08-23","Volition","Deep Silver",[{id:4,name:"Action"},{id:31,name:"Adventure"}],3.5,null,["Open World","Action","Crime","Story Rich"],"full"),
  eg("death-stranding","death-stranding","Death Stranding","From the creator of Metal Gear Solid, an open-world action game.","An open-world action game from Kojima Productions.","1190460","2019-11-08","Kojima Productions","505 Games",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.2,86,["Open World","Story Rich","Sci-fi","Atmospheric"],"full"),
  eg("titanfall-2","titanfall-2","Titanfall 2","Respawn Entertainment's acclaimed FPS with thrilling parkour and Titan combat.","A thrilling FPS with parkour and Titans.","1237970","2016-10-28","Respawn Entertainment","Electronic Arts",[{id:4,name:"Action"}],4.7,94,["FPS","Action","Story Rich","Mechs"],"full"),
  eg("kingdom-come-2","kingdom-come-deliverance-ii","Kingdom Come: Deliverance II","A medieval open-world RPG set in 15th century Bohemia.","A medieval open-world RPG.",null,"2025-02-04","Warhorse Studios","Deep Silver",[{id:4,name:"Action"},{id:5,name:"RPG"},{id:31,name:"Adventure"}],4.3,null,["Medieval","Open World","Story Rich","RPG"],"full"),

  // ── GOG (DRM-Free) — using Steam app IDs for artwork ──
  gg("witcher-3-gog","the-witcher-3-wild-hunt-gog","The Witcher 3: Wild Hunt (GOG)","An open-world fantasy RPG.","The definitive RPG experience.","292030","2015-05-18","CD PROJEKT RED","CD PROJEKT",[{id:4,name:"Action"},{id:5,name:"RPG"},{id:31,name:"Adventure"}],4.8,93,["Open World","Story Rich","Fantasy","RPG"],"full"),
  gg("baldurs-gate-3-gog","baldurs-gate-3-gog","Baldur's Gate 3 (GOG)","Gather your party and return to the Forgotten Realms.","An epic RPG from Larian.","1086940","2023-08-03","Larian Studios","Larian Studios",[{id:5,name:"RPG"},{id:31,name:"Adventure"},{id:12,name:"Strategy"}],4.9,96,["Turn-Based","Story Rich","Co-op","Fantasy"],"full"),
  gg("cyberpunk-2077-gog","cyberpunk-2077-gog","Cyberpunk 2077 (GOG)","An open-world action-adventure RPG set in Night City.","A neon-soaked RPG.","1091500","2020-12-10","CD PROJEKT RED","CD PROJEKT",[{id:4,name:"Action"},{id:5,name:"RPG"},{id:31,name:"Adventure"}],4.2,86,["Open World","Cyberpunk","Story Rich","FPS"],"full"),
  gg("hades-gog","hades-gog","Hades (GOG)","A rogue-like dungeon crawler from Supergiant Games.","Defy the god of the dead.","1145360","2020-09-17","Supergiant Games","Supergiant Games",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.8,93,["Roguelike","Action","Indie","Mythology"],"full"),
  gg("disco-elysium-gog","disco-elysium-gog","Disco Elysium (GOG)","A revolutionary role-playing game.","A groundbreaking RPG.","632470","2019-10-15","ZA/UM","ZA/UM",[{id:5,name:"RPG"},{id:31,name:"Adventure"}],4.6,91,["RPG","Detective","Story Rich","Indie"],"none"),
  gg("divinity-2-gog","divinity-original-sin-2","Divinity: Original Sin 2 (GOG)","A party-based RPG with unprecedented freedom.","A party-based RPG with deep storytelling.","435150","2017-09-14","Larian Studios","Larian Studios",[{id:5,name:"RPG"},{id:12,name:"Strategy"}],4.7,93,["RPG","Co-op","Turn-Based","Story Rich"],"full"),
  gg("stardew-valley-gog","stardew-valley-gog","Stardew Valley (GOG)","Build your dream farm.","A farming RPG.","413150","2016-02-26","ConcernedApe","ConcernedApe",[{id:12,name:"Strategy"},{id:28,name:"Simulation"},{id:31,name:"Adventure"}],4.9,89,["Farming Sim","Pixel Graphics","RPG","Co-op"],"full"),

  // ── Ubisoft Connect ──
  ub("ac-mirage","assassins-creed-mirage","Assassin's Creed Mirage","A return to the series' stealth roots in 9th century Baghdad.","Return to stealth roots.","2023-10-05","Ubisoft Bordeaux","Ubisoft",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.0,74,["Stealth","Historical","Open World","Action"],"full"),
  ub("ac-shadows","assassins-creed-shadows","Assassin's Creed Shadows","A dual protagonist open-world action adventure in feudal Japan.","Open-world action in feudal Japan.","2025-03-20","Ubisoft Quebec","Ubisoft",[{id:4,name:"Action"},{id:31,name:"Adventure"},{id:5,name:"RPG"}],null,null,["Stealth","Open World","Historical","Action"],"full"),
  ub("far-cry-6","far-cry-6","Far Cry 6","A first-person shooter set in the fictional island of Yara.","Fight for freedom in Yara.","2021-10-07","Ubisoft Toronto","Ubisoft",[{id:4,name:"Action"}],4.0,73,["FPS","Open World","Shooter","Action"],"full"),
  ub("watch-dogs-legion","watch-dogs-legion","Watch Dogs: Legion","Recruit and play as anyone in a post-Brexit London.","Hack and recruit anyone.","2020-10-29","Ubisoft Toronto","Ubisoft",[{id:4,name:"Action"},{id:31,name:"Adventure"}],3.6,62,["Open World","Hacking","Stealth","Action"],"full"),
  ub("rainbow-six-siege","rainbow-six-siege","Tom Clancy's Rainbow Six Siege","A tactical 5v5 multiplayer FPS.","A tactical team-based FPS.",null,"2015-12-01","Ubisoft Montreal","Ubisoft",[{id:4,name:"Action"}],4.2,79,["FPS","Tactical","Multiplayer","Competitive"],"none"),
  ub("the-crew-motorfest","the-crew-motorfest","The Crew Motorfest","The ultimate open-world racing festival in Hawaii.","A racing festival in Hawaii.","2023-09-14","Ubisoft Ivory Tower","Ubisoft",[{id:4,name:"Action"},{id:28,name:"Simulation"}],4.0,null,["Racing","Open World","Multiplayer","Cars"],"full"),
  ub("star-wars-outlaws","star-wars-outlaws","Star Wars Outlaws","An open-world action-adventure set between Empire Strikes Back and Return of the Jedi.","An open-world Star Wars game.","2024-08-30","Massive Entertainment","Ubisoft",[{id:4,name:"Action"},{id:31,name:"Adventure"}],3.8,null,["Open World","Star Wars","Action","Adventure"],"full"),

  // ── EA App / Origin ──
  g("jedi-survivor","star-wars-jedi-survivor","Star Wars Jedi: Survivor (EA)","The galaxy-spanning adventure continues.","Cal Kestis must stay ahead of the Empire.","1774580","2023-04-28","Respawn Entertainment","Electronic Arts",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.2,82,["Star Wars","Action","Adventure","Story Rich"],"full"),
  g("it-takes-two","it-takes-two","It Takes Two (EA)","A cooperative action-adventure.","Play as Cody and May.","1426210","2021-03-26","Hazelight Studios","Electronic Arts",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.7,88,["Co-op","Story Rich","Adventure","Platformer"],"full"),

  // ── Xbox Game Pass / Microsoft Store ──
  g("starfield-gp","starfield-gp","Starfield (Game Pass)","The first new universe in 25 years from Bethesda Game Studios.","Explore the cosmos.",null,"2023-09-06","Bethesda Game Studios","Xbox Game Studios",[{id:4,name:"Action"},{id:5,name:"RPG"},{id:12,name:"Strategy"}],3.8,83,["Open World","Space","Sci-fi","RPG"],"full"),
  g("forza-gp","forza-horizon-5-gamepass","Forza Horizon 5 (Game Pass)","Your Ultimate Forza Horizon Adventure in Mexico.","The ultimate open-world racing game.",null,"2021-11-09","Playground Games","Xbox Game Studios",[{id:4,name:"Action"},{id:28,name:"Simulation"}],4.5,92,["Racing","Open World","Multiplayer","Cars"],"full"),
  g("hi-fi-rush","hi-fi-rush","Hi-Fi RUSH","A rhythm action game from Tango Gameworks.","Rock out to the beat.",null,"2023-01-25","Tango Gameworks","Xbox Game Studios",[{id:4,name:"Action"}],4.5,87,["Action","Rhythm","Music","Colorful"],"full"),
  g("grounded","grounded","Grounded","A survival game where you are shrunk in a backyard.","Survive in a backyard.",null,"2022-09-27","Obsidian Entertainment","Xbox Game Studios",[{id:4,name:"Action"},{id:12,name:"Strategy"}],4.3,81,["Survival","Co-op","Open World","Crafting"],"full"),
  g("sea-of-thieves","sea-of-thieves","Sea of Thieves","A shared-world adventure game.","Live the pirate life.",null,"2018-03-20","Rare","Xbox Game Studios",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.3,null,["Multiplayer","Pirates","Open World","Co-op"],"full"),
  g("hellblade-2","hellblade-senuas-saga-ii","Hellblade II: Senua's Saga","The sequel to the award-winning Hellblade.","A dark Norse mythology adventure.",null,"2024-05-21","Ninja Theory","Xbox Game Studios",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.2,80,["Story Rich","Action","Norse","Atmospheric"],"full"),

  // ── PlayStation PC / PlayStation Store ──
  g("spider-man","marvels-spider-man-remastered","Marvel's Spider-Man Remastered","The PC port of the critically acclaimed PS4 exclusive.","Swing through Marvel's New York.","1294730","2022-08-12","Insomniac Games","PlayStation PC LLC",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.7,87,["Superhero","Open World","Action","Story Rich"],"full"),
  g("spider-man-2","marvels-spider-man-2","Marvel's Spider-Man 2","The PC port of the PS5 sequel.","Play as both Spider-Men.",null,"2025-01-30","Insomniac Games","PlayStation PC LLC",[{id:4,name:"Action"},{id:31,name:"Adventure"}],null,null,["Superhero","Open World","Action","Story Rich"],"full"),
  g("horizon-fw","horizon-forbidden-west","Horror: Forbidden West (PC)","The PC port of the PS5 sequel to Zero Dawn.","Aloy explores the Forbidden West.","2420110","2024-03-21","Guerrilla Games","PlayStation PC LLC",[{id:4,name:"Action"},{id:5,name:"RPG"},{id:31,name:"Adventure"}],4.4,83,["Open World","Action RPG","Exploration","Post-Apocalyptic"],"full"),
  g("last-of-us","the-last-of-us-part-i","The Last of Us Part I","A PC port of the acclaimed PS5 remake.","Joel and Ellie's journey.",null,"2024-04-03","Naughty Dog","PlayStation PC LLC",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.6,87,["Story Rich","Zombies","Survival Horror","Action"],"full"),
  g("ghost-tsushima","ghost-of-tsushima-directors-cut","Ghost of Tsushima: Director's Cut","A PC port of the PS5 director's cut.","Explore feudal Japan as a samurai.",null,"2024-05-16","Sucker Punch Productions","PlayStation PC LLC",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.5,83,["Open World","Samurai","Historical","Action"],"full"),
  g("ratchet-rift","ratchet-clank-rift-apart","Ratchet & Clank: Rift Apart","A PC port of the PS5 platformer.","Dimension-hopping action.",null,"2023-07-26","Insomniac Games","PlayStation PC LLC",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.6,88,["Platformer","Action","Co-op","Colorful"],"full"),

  // ── Twitch Games / Prime Gaming ──
  g("warframe","warframe","Warframe","A free-to-play co-op action game.","Play as the Tenno.","230410","2013-03-25","Digital Extremes","Digital Extremes",[{id:4,name:"Action"},{id:5,name:"RPG"}],4.2,null,["Free to Play","Co-op","Action","Sci-fi"],"full"),
  g("lost-ark","lost-ark","Lost Ark","A free-to-play action MMORPG.","A Korean action MMORPG.",null,"2022-02-11","Smilegate RPG","Amazon Games",[{id:4,name:"Action"},{id:5,name:"RPG"}],4.1,null,["MMORPG","Action RPG","Free to Play","Co-op"],"full"),
  g("new-world","new-world","New World","A free-to-play open-world MMORPG set in a supernatural 17th century.","A supernatural open-world MMORPG.",null,"2021-09-28","Amazon Games","Amazon Games",[{id:4,name:"Action"},{id:5,name:"RPG"}],3.8,null,["MMORPG","Open World","Crafting","Multiplayer"],"full"),
  g("lost-ark-eg","lost-ark-eg","Lost Ark (Prime)","The Amazon-published action MMORPG.","Fast-paced action MMORPG.","lost-ark","2022-02-11","Smilegate RPG","Amazon Games",[{id:4,name:"Action"},{id:5,name:"RPG"}],4.1,null,["MMORPG","Action RPG","Free to Play","Co-op"],"full"),
  g("fallout-76","fallout-76","Fallout 76","An online multiplayer action RPG.","Explore the Wasteland with friends.","1174180","2018-11-14","Bethesda Game Studios","Bethesda Softworks",[{id:4,name:"Action"},{id:5,name:"RPG"}],3.6,null,["Multiplayer","RPG","Open World","Survival"],"full"),
  g("destiny-2-lw","destiny-2-lightfall","Destiny 2: Lightfall","The Lightfall expansion for Destiny 2.","A new chapter in the Light and Darkness saga.","1085660","2023-02-28","Bungie","Bungie",[{id:4,name:"Action"},{id:5,name:"RPG"}],4.0,null,["FPS","Loot","Multiplayer","Co-op"],"full"),

  // ── PS5 Exclusives (Coming to PC) ──
  g("wolverine","marvels-wolverine","Marvel's Wolverine","The Wolverine game from Insomniac Games.","An intense Wolverine experience.",null,"2025-09-01","Insomniac Games","PlayStation PC LLC",[{id:4,name:"Action"}],null,null,["Superhero","Action","Story Rich"],"full"),
  g("returnal","returnal","Returnal (PC)","A PC port of the PS5 roguelike third-person shooter.","A rogue-like sci-fi shooter.",null,"2023-02-15","Housemarque","PlayStation PC LLC",[{id:4,name:"Action"}],4.2,86,["Roguelike","Third-Person","Sci-fi","Difficult"],"full"),

  // ── Indie / Hidden Gems ──
  g("tunic","tunic","TUNIC","An action-adventure about a tiny fox in a big world.","Explore a mysterious world.",null,"2022-09-27","Andrew Shouldice","Devolver Digital",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.5,85,["Action","Adventure","Puzzles","Fox"],"full"),
  g("dredge","dredge","Dredge","A creepy fishing adventure game.","Catch fish and uncover secrets.",null,"2023-03-30","Black Salt Games","Team17",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.4,82,["Horror","Fishing","Exploration","Indie"],"full"),
  g("animal-well","animal-well","Animal Well","A mysterious Metroidvania with environmental puzzles.","Solve puzzles in a strange well.",null,"2024-05-09","Billy Basso","Bigmode",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.6,null,["Metroidvania","Puzzles","Exploration","Indie"],"full"),
  g("balatro","balatro","Balatro","The poker roguelike.","A deckbuilder roguelike.",null,"2024-02-20","LocalThunk","Playstack",[{id:12,name:"Strategy"}],4.8,null,["Card Game","Roguelike","Poker","Strategy"],"full"),
  g("ultros","ultros","ULTROS","A psychedelic Metroidvania set in a living spaceship.","A colorful alien adventure.",null,"2024-02-13","Hadoque","Lambda Dimensions",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.1,null,["Metroidvania","Sci-fi","Colorful","Indie"],"full"),
  g("neva","neva","Neva","A beautiful action-adventure about a warrior and her wolf.","A story of bond and beauty.",null,"2024-10-15","Nomada Studio","Devolver Digital",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.5,null,["Beautiful","Story Rich","Action","Artistic"],"full"),
  g("little-kitty","little-kitty-big-city","Little Kitty, Big City","A cat adventure game.","Cause chaos as a cat.",null,"2024-05-09","Double Dagger Studio","Double Dagger Studio",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.2,null,["Cat","Adventure","Open World","Relaxing"],"full"),
  g("botany-manor","botany-manor","Botany Manor","A first-person puzzle game about growing plants.","Grow plants to solve puzzles.",null,"2024-04-09","Balloon Studios","Whitethorn Games",[{id:31,name:"Adventure"}],4.3,null,["Puzzles","Relaxing","Exploration","Indie"],"none"),

  // ── VR / Meta Quest (PC VR) ──
  g("half-life-alyx","half-life-alyx","Half-Life: Alyx","Valve's long-awaited return to the Half-Life universe in VR.","A VR return to City 17.","546560","2020-03-23","Valve","Valve",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.8,93,["VR","FPS","Sci-fi","Story Rich"],"full"),
  g("beatsaber","beat-saber","Beat Saber","The most popular VR rhythm game.","Slash beats to the rhythm.",null,"2019-05-21","Beat Games","Meta",[{id:4,name:"Action"}],4.6,null,["VR","Rhythm","Music","Exercise"],"full"),

  // ── More Indie Hits ──
  g("vampire-survivors","vampire-survivors","Vampire Survivors","A gothic horror game with auto-attack and roguelite elements.","Survive waves of monsters.",null,"2022-12-20","poncle","poncle",[{id:4,name:"Action"}],4.6,null,["Roguelike","Action","Indie","Vampire"],"none"),
  g("broforce","broforce","Broforce","An action-packed run-and-gun platformer with explosive protagonists.","Freedom costs a buck o five.",null,"2015-10-15","Free Lives","Devolver Digital",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.5,null,["Action","Platformer","Co-op","Pixel Graphics"],"full"),
  g("warhammer-40k","warhammer-40000-darktide","Warhammer 40,000: Darktide","A co-op FPS set in the Warhammer 40K universe.","Fight hordes in the 41st millennium.",null,"2022-11-30","Fatshark","Fatshark",[{id:4,name:"Action"}],4.2,null,["Co-op","FPS","Loot","Warhammer"],"full"),
  g("remnant-2","remnant-2","Remnant II","A third-person action RPG with procedurally generated worlds.","A souls-like shooter.",null,"2023-07-25","Gunfire Games","Gearbox Publishing",[{id:4,name:"Action"},{id:5,name:"RPG"}],4.3,null,["Souls-like","Co-op","Shooter","Action RPG"],"full"),
  g("lies-of-p","lies-of-p","Lies of P","A soulslike game inspired by the story of Pinocchio.","A dark soulslike fairytale.",null,"2023-09-19","Round8 Studio","NEOWIZ",[{id:4,name:"Action"}],4.3,80,["Souls-like","Action","Story Rich","Difficult"],"full"),
  g("wo-long","wo-long-fallen-dynasty","Wo Long: Fallen Dynasty","A challenging action RPG set in a dark fantasy version of the Three Kingdoms period.","A challenging Three Kingdoms action RPG.",null,"2023-03-03","Team Ninja","KOEI TECMO",[{id:4,name:"Action"},{id:5,name:"RPG"}],4.0,76,["Souls-like","Action","RPG","Co-op"],"full"),
  g("palworld-eg","palworld-eg","Palworld (Epic)","A multiplayer open-world survival crafting game with Pals.","Catch and battle Pals.",null,"2024-01-19","Pocketpair","Pocketpair",[{id:4,name:"Action"},{id:12,name:"Strategy"}],4.3,null,["Survival","Multiplayer","Crafting","Open World"],"full"),
];

// ── Query functions ──
export function getGames() { return GAME_DATABASE; }
export function getGame(id) { return GAME_DATABASE.find((x) => x.id === id); }
export function getGameBySlug(slug) { return GAME_DATABASE.find((x) => x.slug === slug); }
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
      payload: { id: g.id, name: g.name, executable: g.executable || provider?.appId, arguments: g.arguments, workingDir: g.workingDir, provider: provider?.type, providerAppId: provider?.appId, launchMethod: provider?.launchMethod },
    });
  }
  return { ok: true, data: g };
}
