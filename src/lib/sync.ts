import "server-only";
import { syncAchievements } from "./achievements";
import { syncSeries } from "./collection";
import { recordSnapshot } from "./history";
import { syncDurations } from "./igdb";
import { syncFriends } from "./social";
import { ownedGames, playerSummary, resolveSteamId, STORE_BATCH, SteamError, storeItems, tagNames, wishlist } from "./steam";
import { igdbConfigured, readJson, writeLibraryFile } from "./storage";
import type { LibraryFile, SeriesFile, SyncEvent } from "./types";

/** Une étape facultative qui plante ne doit pas faire échouer toute la synchro. */
async function* optional(label: string, step: AsyncGenerator<SyncEvent>, end: number): AsyncGenerator<SyncEvent> {
  try {
    yield* step;
  } catch (e) {
    yield { message: `${label} : ${e instanceof Error ? e.message : String(e)}`, progress: end, warning: true };
  }
}

/**
 * 1. Profil, jeux, wishlist                     4. Succès (seulement les jeux rejoués depuis)
 * 2. Fiches Store par lots de 200               5. Amis
 * 3. Photo des temps de jeu (historique)        6. Séries          7. Durées IGDB (si configuré)
 */
export async function* runSync(): AsyncGenerator<SyncEvent> {
  const key = process.env.STEAM_API_KEY;
  const ident = process.env.STEAM_ID;
  if (!key || !ident) throw new SteamError("Renseigne STEAM_API_KEY et STEAM_ID dans .env.local.");

  yield { message: "Recherche du profil…", progress: 0 };
  const steamid = await resolveSteamId(key, ident);
  const profile = await playerSummary(key, steamid);

  yield { message: `Récupération de la bibliothèque de ${profile.persona}…`, progress: 0.03 };
  const [games, wish, tags] = await Promise.all([ownedGames(key, steamid), wishlist(steamid), tagNames()]);
  const now = Math.floor(Date.now() / 1000);

  const lib: LibraryFile = { source: "steam", profile, syncedAt: now, games, wishlist: wish, store: {} };
  // Jeux possédés + wishlist + jeux des séries déjà connues : tous les prix restent frais
  const series = Object.values(await readJson<SeriesFile>("series", {})).flatMap((s) => s.appids);
  const ids = [...new Set([...games.map((g) => g.appid), ...wish.map((w) => w.appid), ...series])];
  for (let i = 0; i < ids.length; i += STORE_BATCH) {
    yield { message: `Fiches Store ${i + 1}–${Math.min(i + STORE_BATCH, ids.length)} sur ${ids.length}…`, progress: 0.06 + (0.14 * i) / ids.length };
    for (const [appid, info] of await storeItems(ids.slice(i, i + STORE_BATCH), tags)) lib.store[appid] = info;
  }
  await writeLibraryFile(lib);
  await recordSnapshot(games, now);

  yield* optional("Succès", syncAchievements(key, steamid, games, 0.2, 0.75), 0.75);
  yield* optional("Amis", syncFriends(key, steamid, 0.75, 0.82), 0.82);
  yield* optional("Séries", syncSeries(lib, 0.82, 0.95), 0.95);
  await writeLibraryFile(lib); // les séries ont pu ajouter des fiches Store
  if (igdbConfigured()) yield* optional("Durées IGDB", syncDurations(games, 0.95, 1), 1);

  yield { message: `${games.length} jeux synchronisés.`, progress: 1 };
}
