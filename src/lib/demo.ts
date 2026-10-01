import "server-only";
import { writeLibraryFile } from "./storage";
import type { LibraryFile, OwnedGame, StoreInfo } from "./types";

/*
 * Bibliothèque de démonstration : de vrais jeux (pour les jaquettes), des temps de jeu inventés.
 * Prix et notes approximatifs, pour tester l'appli sans clé API.
 */

const [A, AV, RPG, IND, STR, SIM, OCC, SPO, CRS, F2P] = [
  "Action", "Aventure", "RPG", "Indépendant", "Stratégie", "Simulation",
  "Occasionnel", "Sport", "Course", "Free-to-play",
];

// appid, nom, genres, prix plein (€), Metacritic
const GAMES: [number, string, string[], number, number | null][] = [
  [1245620, "ELDEN RING", [A, RPG], 59.99, 94],
  [292030, "The Witcher 3: Wild Hunt", [RPG], 29.99, 93],
  [1086940, "Baldur's Gate 3", [AV, RPG, STR], 59.99, 96],
  [374320, "DARK SOULS III", [A], 59.99, 89],
  [814380, "Sekiro: Shadows Die Twice", [A, AV], 59.99, 88],
  [1091500, "Cyberpunk 2077", [RPG], 59.99, 86],
  [489830, "The Elder Scrolls V: Skyrim Special Edition", [RPG], 39.99, null],
  [377160, "Fallout 4", [RPG], 19.99, 84],
  [1174180, "Red Dead Redemption 2", [A, AV], 59.99, 93],
  [271590, "Grand Theft Auto V", [A, AV], 29.99, 96],
  [413150, "Stardew Valley", [IND, RPG, SIM], 13.99, 89],
  [367520, "Hollow Knight", [A, AV, IND], 14.79, 87],
  [1145360, "Hades", [A, IND, RPG], 24.5, 93],
  [1145350, "Hades II", [A, IND, RPG], 29.5, 94],
  [105600, "Terraria", [A, AV, IND, RPG], 9.75, 83],
  [620, "Portal 2", [A, AV], 9.75, 95],
  [400, "Portal", [A], 9.75, 90],
  [646570, "Slay the Spire", [IND, STR], 24.5, 89],
  [250900, "The Binding of Isaac: Rebirth", [A, IND], 14.99, 86],
  [504230, "Celeste", [A, AV, IND], 19.99, 88],
  [588650, "Dead Cells", [A, IND], 24.99, 89],
  [294100, "RimWorld", [IND, SIM, STR], 34.99, 87],
  [427520, "Factorio", [SIM, STR], 32, 90],
  [892970, "Valheim", [A, AV, IND, RPG], 19.99, null],
  [1794680, "Vampire Survivors", [A, OCC, IND, RPG], 4.99, 86],
  [2379780, "Balatro", [OCC, IND, STR], 13.99, 90],
  [632470, "Disco Elysium - The Final Cut", [RPG], 39.99, 97],
  [753640, "Outer Wilds", [A, AV], 22.99, 85],
  [391540, "Undertale", [IND, RPG], 9.99, 92],
  [268910, "Cuphead", [A, IND], 19.99, 88],
  [1868140, "DAVE THE DIVER", [AV, OCC, IND, RPG, SIM], 19.99, 90],
  [289070, "Sid Meier's Civilization VI", [STR], 59.99, 88],
  [8930, "Sid Meier's Civilization V", [STR], 29.99, 90],
  [236850, "Europa Universalis IV", [SIM, STR], 39.99, 87],
  [394360, "Hearts of Iron IV", [SIM, STR], 44.99, 83],
  [582010, "Monster Hunter: World", [A], 29.99, 88],
  [2050650, "Resident Evil 4", [A, AV], 39.99, 93],
  [883710, "Resident Evil 2", [A, AV], 39.99, 91],
  [1196590, "Resident Evil Village", [A, AV], 39.99, 84],
  [1593500, "God of War", [A, AV, RPG], 49.99, 93],
  [601150, "Devil May Cry 5", [A], 29.99, 88],
  [2358720, "Black Myth: Wukong", [A, AV, RPG], 59.99, 81],
  [553850, "HELLDIVERS 2", [A], 39.99, 82],
  [1966720, "Lethal Company", [A, AV, IND], 9.75, null],
  [1623730, "Palworld", [A, AV, IND, RPG], 28.99, null],
  [322330, "Don't Starve Together", [AV, IND, SIM], 14.99, null],
  [239140, "Dying Light", [A, RPG], 19.99, 75],
  [268500, "XCOM 2", [STR], 49.99, 88],
  [1817070, "Marvel's Spider-Man Remastered", [A, AV], 59.99, 87],
  [945360, "Among Us", [OCC], 4.49, null],
  [381210, "Dead by Daylight", [A], 19.99, null],
  [252950, "Rocket League", [A, IND, CRS, SPO, F2P], 0, 86],
  [730, "Counter-Strike 2", [A, F2P], 0, null],
  [570, "Dota 2", [A, STR, F2P], 0, 90],
  [440, "Team Fortress 2", [A, F2P], 0, 92],
];

// Quelques gros compteurs (heures) pour ressembler à une vraie bibliothèque
const FAVORITES: Record<number, number> = {
  289070: 412, 570: 860, 1245620: 214, 413150: 168, 730: 305, 294100: 190,
  292030: 131, 1145360: 74, 427520: 250, 646570: 96, 105600: 88,
};
const NEVER = new Set([1091500, 489830, 1174180, 1817070, 2358720, 632470, 236850,
  1196590, 883710, 1623730, 268500, 945360, 753640, 1593500]);

/** Générateur pseudo-aléatoire reproductible (mulberry32). */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function loadDemo(): Promise<number> {
  const rand = rng(7);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const now = Math.floor(Date.now() / 1000);
  const games: OwnedGame[] = [];
  const store: Record<number, StoreInfo> = {};

  for (const [appid, name, genres, price, metacritic] of GAMES) {
    let hours: number;
    if (appid in FAVORITES) hours = FAVORITES[appid] * (0.9 + rand() * 0.2);
    else if (NEVER.has(appid)) hours = 0;
    else if (rand() < 0.3) hours = 0.2 + rand() * 1.7;
    else hours = Math.exp(2.6 + 0.9 * Math.sqrt(-2 * Math.log(rand() || 1e-9)) * Math.cos(2 * Math.PI * rand()));

    const playtimeMin = Math.round(hours * 60);
    const recent = playtimeMin && rand() < 0.12 ? Math.min(playtimeMin, Math.round(60 + rand() * 840)) : 0;
    const days = recent ? Math.floor(rand() * 10) : 30 + Math.floor(rand() * 9 * 365);
    games.push({ appid, name, playtimeMin, playtime2wMin: recent, lastPlayed: playtimeMin ? now - days * 86400 : 0 });

    const cents = Math.round(price * 100);
    const discount = cents ? pick([0, 0, 0, 0, 25, 50, 67, 75]) : 0;
    const priceCents = cents ? Math.round((cents * (100 - discount)) / 100) : undefined;
    store[appid] = {
      v: 2,
      fetchedAt: now,
      ok: true,
      isFree: cents === 0,
      priceCents,
      fullPriceCents: cents || undefined,
      discountPct: discount,
      lowestRecentCents: priceCents,
      tags: genres,
      developers: [],
      franchises: [],
      // La note Metacritic sert d'ordre de grandeur pour le % d'évaluations positives
      reviewPct: metacritic ?? 80 + Math.floor(rand() * 15),
      reviewCount: Math.round(2_000 + rand() * 300_000),
      reviewLabel: "très positives",
    };
  }

  const lib: LibraryFile = { source: "demo", profile: { persona: "Joueur démo" }, syncedAt: now, games, store };
  await writeLibraryFile(lib);
  return games.length;
}
