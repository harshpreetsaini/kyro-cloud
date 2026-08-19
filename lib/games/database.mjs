// KYRO CLOUD — Game Database
// Real game metadata with Steam CDN artwork

function sc(appId) {
  return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;
}

function sh(appId) {
  return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/page_bg_generated_v6b.jpg`;
}

function ss(appId, count = 2) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    url: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/ss_${i + 1}.1920x1080.jpg`,
    width: 1920,
    height: 1080,
  }));
}

function g(id, slug, name, desc, short, appId, release, dev, pub, genres, rating, mc, tags, ctrl = "full") {
  return {
    id, slug, name, description: desc, shortDescription: short,
    coverImage: appId ? sc(appId) : null,
    heroImage: appId ? sh(appId) : null,
    screenshots: appId ? ss(appId) : [],
    releaseDate: release, developer: dev, publisher: pub,
    genres, rating, metacritic: mc, platforms: ["PC"],
    providers: appId ? [{ id: `steam-${id}`, type: "steam", name: "Steam", appId, launchMethod: "steam", availability: "available" }] : [],
    availability: "available", installed: false, favorite: false,
    lastPlayedAt: null, playTime: 0, running: false,
    compatibility: "SUPPORTED", tags, controllerSupport: ctrl,
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

export const GAME_DATABASE = [
  // ── AAA Action / RPG ──
  g("cyberpunk-2077","cyberpunk-2077","Cyberpunk 2077","Cyberpunk 2077 is an open-world, action-adventure RPG set in the megalopolis of Night City.","An open-world action-adventure RPG set in Night City.","1091500","2020-12-10","CD PROJEKT RED","CD PROJEKT",[{id:4,name:"Action"},{id:5,name:"RPG"},{id:31,name:"Adventure"}],4.2,86,["Open World","Cyberpunk","Story Rich","FPS"]),
  g("elden-ring","elden-ring","Elden Ring","A new fantasy action RPG. Rise, Tarnished, and be guided by grace to brandish the power of the Elden Ring.","A fantasy action RPG from FromSoftware.","1245620","2022-02-25","FromSoftware Inc.","Bandai Namco Entertainment",[{id:4,name:"Action"},{id:5,name:"RPG"},{id:31,name:"Adventure"}],4.7,94,["Souls-like","Open World","Difficult","Fantasy"]),
  g("baldurs-gate-3","baldurs-gate-3","Baldur's Gate 3","Gather your party and return to the Forgotten Realms in a tale of fellowship and betrayal.","A epic RPG from Larian Studios.","1086940","2023-08-03","Larian Studios","Larian Studios",[{id:5,name:"RPG"},{id:31,name:"Adventure"},{id:12,name:"Strategy"}],4.9,96,["Turn-Based","Story Rich","Co-op","Fantasy"]),
  g("rdr2","red-dead-redemption-2","Red Dead Redemption 2","America, 1899. Arthur Morgan and the Van der Linde gang are on the run.","An epic tale of life in America's unforgiving heartland.","1174180","2018-10-26","Rockstar Games","Rockstar Games",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.8,97,["Open World","Story Rich","Western","Multiplayer"]),
  g("gta-v","grand-theft-auto-v","Grand Theft Auto V","Explore the award-winning world of Los Santos and Blaine County.","The iconic open-world crime saga.","271590","2015-04-14","Rockstar North","Rockstar Games",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.5,96,["Open World","Multiplayer","Crime","Action"]),
  g("witcher-3","the-witcher-3-wild-hunt","The Witcher 3: Wild Hunt","As war rages throughout the Northern Realms, you take on the greatest contract of your life.","A story-driven open world RPG.","292030","2015-05-18","CD PROJEKT RED","CD PROJEKT",[{id:4,name:"Action"},{id:5,name:"RPG"},{id:31,name:"Adventure"}],4.8,93,["Open World","Story Rich","Fantasy","RPG"]),
  g("hogwarts-legacy","hogwarts-legacy","Hogwarts Legacy","An open-world action RPG set in the world of the Harry Potter books.","An open-world action RPG set in the Wizarding World.","990080","2023-02-10","Avalanche Software","Warner Bros. Games",[{id:4,name:"Action"},{id:5,name:"RPG"},{id:31,name:"Adventure"}],4.4,84,["Open World","Magic","Fantasy","RPG"]),
  g("starfield","starfield","Starfield","The first new universe in 25 years from Bethesda Game Studios.","A new universe from Bethesda Game Studios.","1716740","2023-09-06","Bethesda Game Studios","Bethesda Softworks",[{id:4,name:"Action"},{id:5,name:"RPG"},{id:12,name:"Strategy"}],3.8,83,["Open World","Space","Sci-fi","RPG"]),
  g("diablo-4","diablo-iv","Diablo IV","Diablo IV is the next-gen action RPG experience with endless evil to slaughter.","The next-gen action RPG experience.","2344520","2023-06-06","Blizzard Entertainment","Blizzard Entertainment",[{id:4,name:"Action"},{id:5,name:"RPG"}],4.1,86,["Action RPG","Dungeon Crawler","Loot","Multiplayer"]),
  g("god-of-war","god-of-war","God of War","His vengeance against the Gods of Olympus years behind him, Kratos now lives as a man in the realm of Norse Gods.","An epic action-adventure from Santa Monica Studio.","1593500","2022-01-14","Santa Monica Studio","PlayStation PC LLC",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.8,94,["Action","Mythology","Story Rich","Adventure"]),
  g("star-wars-jedi","star-wars-jedi-survivor","STAR WARS Jedi: Survivor","The galaxy-spanning adventure continues. Cal Kestis must stay ahead of the Empire.","The galaxy-spanning adventure continues.","1774580","2023-04-28","Respawn Entertainment","Electronic Arts",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.2,82,["Star Wars","Action","Adventure","Story Rich"]),

  // ── Shooters ──
  g("cs2","counter-strike-2","Counter-Strike 2","The next evolution of competitive FPS.","The next evolution of competitive FPS.","730","2023-09-27","Valve","Valve",[{id:4,name:"Action"}],4.3,83,["FPS","Competitive","Multiplayer","Tactical"],"none"),
  g("apex-legends","apex-legends","Apex Legends","Join legends from the edges of the Frontier in a battle royale shooter.","A battle royale shooter with unique Legends.","1172470","2019-02-04","Respawn Entertainment","Electronic Arts",[{id:4,name:"Action"}],4.1,null,["Battle Royale","FPS","Multiplayer","Free to Play"]),
  g("overwatch-2","overwatch-2","Overwatch 2","The world needs heroes. An always-on, ever-evolving free-to-play team-based game.","A free-to-play team-based shooter.","2357570","2022-10-04","Blizzard Entertainment","Blizzard Entertainment",[{id:4,name:"Action"}],3.9,null,["FPS","Multiplayer","Hero Shooter","Free to Play"]),
  g("destiny-2","destiny-2","Destiny 2","Explore the mysteries of the solar system and the powers within.","An online multiplayer shooter with RPG elements.","1085660","2019-10-01","Bungie","Bungie",[{id:4,name:"Action"},{id:5,name:"RPG"}],4.0,null,["FPS","Loot","Multiplayer","Co-op"]),
  g("doom-eternal","doom-eternal","DOOM Eternal","The direct sequel to the award-winning DOOM (2016). The ultimate combination of speed and power.","The ultimate fast-paced FPS.","782330","2020-03-20","id Software","Bethesda Softworks",[{id:4,name:"Action"}],4.6,89,["FPS","Action","Demons","Fast-Paced"]),
  g("helldivers-2","helldivers-2","Helldivers 2","The galaxy needs super earth's finest. Fight for freedom in this intense co-op shooter.","An intense co-op third-person shooter.","553850","2024-02-08","Arrowhead Game Studios","PlayStation Publishing LLC",[{id:4,name:"Action"}],4.4,82,["Co-op","Shooter","Action","Multiplayer"]),
  g("valorant","valorant","VALORANT","A 5v5 character-based tactical FPS where precise gunplay meets unique agent abilities.","A character-based tactical FPS.",null,"2020-06-02","Riot Games","Riot Games",[{id:4,name:"Action"}],4.2,null,["FPS","Competitive","Multiplayer","Tactical"],"none"),
  g("cod-mw3","call-of-duty-modern-warfare-3","Call of Duty: Modern Warfare III","The definitive multiplayer experience returns with revamped maps and an all-new Zombies experience.","The definitive multiplayer experience.","2519060","2023-11-10","Sledgehammer Games","Activision",[{id:4,name:"Action"}],3.8,61,["FPS","Multiplayer","Action","Shooter"]),

  // ── Survival / Crafting ──
  g("valheim","valheim","Valheim","A brutal exploration and survival game for 1-10 players set in a Viking-inspired purgatory.","A Viking survival game.","892970","2021-02-02","Iron Gate AB","Coffee Stain Publishing",[{id:4,name:"Action"},{id:12,name:"Strategy"},{id:28,name:"Simulation"}],4.4,90,["Survival","Open World","Co-op","Viking"]),
  g("subnautica","subnautica","Subnautica","Descend into the depths of an alien underwater world filled with wonder and peril.","An underwater survival adventure.","264710","2018-01-23","Unknown Worlds Entertainment","Unknown Worlds Entertainment",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.6,87,["Survival","Open World","Exploration","Underwater"]),
  g("rust","rust","Rust","The only aim in Rust is to survive. Do everything you can to last another night.","A multiplayer survival game.","252490","2018-02-08","Facepunch Studios","Facepunch Studios",[{id:4,name:"Action"},{id:28,name:"Simulation"}],4.1,null,["Survival","Multiplayer","Crafting","Open World"]),
  g("terraria","terraria","Terraria","Dig, fight, explore, build! Nothing is impossible in this action-packed adventure.","Dig, fight, explore, build!","105600","2011-05-16","Re-Logic","Re-Logic",[{id:4,name:"Action"},{id:12,name:"Strategy"},{id:28,name:"Simulation"}],4.8,83,["Sandbox","Survival","Crafting","2D"]),
  g("raft","raft","Raft","Survive the ocean and build your dream raft with friends.","A survival game set in the ocean.","648800","2022-06-20","Redbeet Interactive","Axolot Games",[{id:4,name:"Action"},{id:31,name:"Adventure"}],4.2,null,["Survival","Co-op","Ocean","Crafting"]),
  g("7dtd","7-days-to-die","7 Days to Die","An open-world survival horror game that is a unique combination of FPS, survival, and RPG.","A survival horror open-world game.","251570","2013-12-13","The Fun Pimps","The Fun Pimps",[{id:4,name:"Action"},{id:5,name:"RPG"}],4.0,null,["Survival","Zombies","Crafting","Open World"]),
  g("palworld","palworld","Palworld","A multiplayer, open-world survival crafting game where you capture and battle creatures called Pals.","A multiplayer open-world survival crafting game.","1623730","2024-01-19","Pocketpair","Pocketpair",[{id:4,name:"Action"},{id:12,name:"Strategy"}],4.3,null,["Survival","Multiplayer","Crafting","Open World"]),

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
