import "server-only";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AchSummary, Duration, Game, LibraryFile, OwnedGame, StoreInfo } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const CDN = (appid: number) =>
  `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appid}/header.jpg`;

/** Fichiers déjà lus, gardés en mémoire tant qu'ils ne changent pas (achievements.json pèse ~10 Mo). */
const cache = new Map<string, { mtimeMs: number; data: unknown }>();

/** Lit data/<name>.json, ou renvoie `fallback` s'il n'existe pas encore. */
export async function readJson<T>(name: string, fallback: T): Promise<T> {
  const file = path.join(DATA_DIR, `${name}.json`);
  try {
    const { mtimeMs } = await stat(file);
    const hit = cache.get(file);
    if (hit && hit.mtimeMs === mtimeMs) return hit.data as T;
    const data = JSON.parse(await readFile(file, "utf-8"));
    cache.set(file, { mtimeMs, data });
    return data;
  } catch {
    return fallback;
  }
}

/** Écriture atomique : un fichier temporaire puis un renommage, pour ne jamais laisser un JSON à moitié écrit. */
export async function writeJson(name: string, data: unknown): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const file = path.join(DATA_DIR, `${name}.json`);
  await writeFile(`${file}.tmp`, JSON.stringify(data), "utf-8");
  await rename(`${file}.tmp`, file);
}

export const readLibraryFile = () => readJson<LibraryFile | null>("library", null);
export const writeLibraryFile = (lib: LibraryFile) => writeJson("library", lib);

export function isConfigured(): boolean {
  return Boolean(process.env.STEAM_API_KEY && process.env.STEAM_ID);
}

export function igdbConfigured(): boolean {
  return Boolean(process.env.IGDB_CLIENT_ID && process.env.IGDB_CLIENT_SECRET);
}

/** Fusionne un jeu et sa fiche Store en objet prêt à afficher. */
export function toGame(
  g: OwnedGame,
  store: StoreInfo | undefined,
  extras: { ach?: AchSummary | null; duration?: Duration | null } = {},
): Game {
  // Les fiches d'avant la v2 (API appdetails) avaient des genres au lieu des tags, et une date en texte
  const s = store as (Partial<StoreInfo> & { genres?: string[] }) | undefined;
  const isFree = Boolean(s?.isFree);
  const cents = (c?: number) => (c == null ? null : c / 100);
  return {
    ...g,
    dexNo: 0,
    hours: g.playtimeMin / 60,
    hours2w: g.playtime2wMin / 60,
    status: g.playtimeMin === 0 ? "never" : g.playtimeMin < 120 ? "tasted" : "played",
    tags: s?.tags ?? s?.genres ?? [],
    developers: s?.developers ?? [],
    franchises: s?.franchises ?? [],
    multiplayer: Boolean(s?.multiplayer),
    price: isFree ? 0 : cents(s?.priceCents),
    fullPrice: isFree ? 0 : cents(s?.fullPriceCents),
    discountPct: s?.discountPct ?? 0,
    lowestRecentPrice: cents(s?.lowestRecentCents),
    isFree,
    reviewPct: s?.reviewPct ?? null,
    reviewCount: s?.reviewCount ?? 0,
    reviewLabel: s?.reviewLabel ?? null,
    releaseDate: s?.v === 2 ? (s.releaseDate ?? null) : null,
    cover: s?.headerImage || CDN(g.appid),
    hero: s?.heroImage ?? null,
    shortDesc: s?.shortDesc ?? null,
    earlyAccess: Boolean(s?.earlyAccess),
    ach: extras.ach ?? null,
    duration: extras.duration ?? null,
  };
}

/** Jeu non possédé (wishlist, série) : pas de temps de jeu. */
export function storeOnlyGame(appid: number, store: StoreInfo | undefined): Game {
  return toGame({ appid, name: store?.name ?? `App ${appid}`, playtimeMin: 0, playtime2wMin: 0, lastPlayed: 0 }, store);
}
