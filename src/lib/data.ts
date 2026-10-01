import "server-only";
import { achievementsView, achSummary, readAchievements, type AchievementsView } from "./achievements";
import { collectionView, type SeriesView, type StudioView } from "./collection";
import { historyView, type HistoryView } from "./history";
import { readDurations } from "./igdb";
import { profileView, type ProfileView } from "./profile";
import { readSocial, socialView, type SocialView } from "./social";
import { readLibraryFile, storeOnlyGame, toGame } from "./storage";
import type { AchievementsFile, Duration, DurationEntry, DurationsFile, Library, SocialFile, WishGame } from "./types";

export type AppData = {
  library: Library;
  wishlist: WishGame[];
  history: HistoryView;
  achievements: AchievementsView;
  social: SocialView | null;
  series: SeriesView[];
  studios: StudioView[];
  profile: ProfileView;
};

const hours = (s?: number) => (s ? s / 3600 : null);
const toDuration = (d?: DurationEntry): Duration | null =>
  d && !d.none ? { hastily: hours(d.hastily), normally: hours(d.normally), completely: hours(d.completely) } : null;

const EMPTY_HISTORY: HistoryView = { since: null, snapshots: 0, weeks: [], recent: [], comebacks: [] };

/** Tout ce dont la page a besoin, calculé côté serveur. En démo, seuls les jeux existent. */
export async function loadAppData(): Promise<AppData | null> {
  const file = await readLibraryFile();
  if (!file || file.games.length === 0) return null;
  const demo = file.source === "demo";
  const now = Math.floor(Date.now() / 1000);

  const [ach, durations, social, history]: [AchievementsFile, DurationsFile, SocialFile | null, HistoryView] = demo
    ? [{}, {}, null, EMPTY_HISTORY]
    : await Promise.all([readAchievements(), readDurations(), readSocial(), historyView(now)]);

  const games = file.games.map((g) =>
    toGame(g, file.store[g.appid], { ach: achSummary(ach[g.appid]), duration: toDuration(durations[g.appid]) }),
  );
  // Numéro de Dex : comme un Pokédex, un ordre fixe pour toute la collection. N° 001 = le plus ancien jeu.
  [...games]
    .sort((a, b) => (a.releaseDate ?? Infinity) - (b.releaseDate ?? Infinity) || a.appid - b.appid)
    .forEach((g, i) => (g.dexNo = i + 1));
  const owned = new Set(games.map((g) => g.appid));
  const wishlist = (file.wishlist ?? [])
    .filter((w) => !owned.has(w.appid))
    .map((w) => ({ ...storeOnlyGame(w.appid, file.store[w.appid]), added: w.added }));

  const achievements = achievementsView(ach);
  const { series, studios } = demo ? { series: [], studios: [] } : await collectionView(file, games);

  return {
    library: { source: file.source, profile: file.profile, syncedAt: file.syncedAt, games },
    wishlist,
    history,
    achievements,
    social: social ? socialView(social, games) : null,
    series,
    studios,
    profile: profileView(games, achievements, now),
  };
}
