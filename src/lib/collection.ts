import "server-only";
import { STORE_BATCH, storeItems, storeSearch, tagNames } from "./steam";
import { readJson, storeOnlyGame, writeJson } from "./storage";
import type { Game, LibraryFile, SeriesFile, SyncEvent } from "./types";

const DAY = 86400;
const SERIES_TTL = 30 * DAY;
/** Recherches Store max par synchro : le reste des séries sera complété aux synchros suivantes. */
const SEARCHES_PER_SYNC = 60;
const PARALLEL = 4;

/**
 * Pour chaque série (« franchise » Steam) de tes jeux : recherche Store sur son nom, puis on ne garde
 * que les résultats dont la fiche appartient bien à cette série. Les séries dans lesquelles tu as le plus
 * joué passent en premier ; chaque série est revérifiée au bout de 30 jours.
 */
export async function* syncSeries(lib: LibraryFile, from: number, to: number): AsyncGenerator<SyncEvent> {
  const file = await readJson<SeriesFile>("series", {});
  const now = Math.floor(Date.now() / 1000);
  const hours = new Map<string, number>();
  for (const g of lib.games) {
    for (const f of lib.store[g.appid]?.franchises ?? []) hours.set(f, (hours.get(f) ?? 0) + g.playtimeMin);
  }
  const todo = [...hours.entries()]
    .filter(([name]) => !file[name] || file[name].fetchedAt < now - SERIES_TTL)
    .sort((a, b) => b[1] - a[1])
    .slice(0, SEARCHES_PER_SYNC)
    .map(([name]) => name);
  if (!todo.length) return;

  const candidates = new Map<string, number[]>();
  for (let i = 0; i < todo.length; i += PARALLEL) {
    await Promise.all(todo.slice(i, i + PARALLEL).map(async (name) => candidates.set(name, await storeSearch(name))));
    const done = Math.min(i + PARALLEL, todo.length);
    yield { message: `Séries : ${done}/${todo.length} recherchées…`, progress: from + ((to - from) * 0.8 * done) / todo.length };
  }

  // Fiches des candidats pas encore connus, par lots
  const unknown = [...new Set([...candidates.values()].flat())].filter((id) => !lib.store[id]);
  const tags = unknown.length ? await tagNames() : new Map();
  for (let i = 0; i < unknown.length; i += STORE_BATCH) {
    for (const [appid, info] of await storeItems(unknown.slice(i, i + STORE_BATCH), tags)) lib.store[appid] = info;
  }

  for (const name of todo) {
    const owned = lib.games.filter((g) => lib.store[g.appid]?.franchises.includes(name)).map((g) => g.appid);
    const found = (candidates.get(name) ?? []).filter((id) => {
      const s = lib.store[id];
      return s?.ok && s.type === 0 && s.franchises.includes(name);
    });
    file[name] = { fetchedAt: now, appids: [...new Set([...owned, ...found])] };
  }
  await writeJson("series", file);
  yield { message: "Séries à jour.", progress: to };
}

export type SeriesView = {
  name: string;
  hours: number;
  owned: Game[];
  missing: Game[];
  costToComplete: number;
};

export type StudioView = { name: string; hours: number; count: number; played: number; top: number[] };

export async function collectionView(lib: LibraryFile, games: Game[]): Promise<{ series: SeriesView[]; studios: StudioView[] }> {
  const file = await readJson<SeriesFile>("series", {});
  const byId = new Map(games.map((g) => [g.appid, g]));

  const series = Object.entries(file)
    .map(([name, { appids }]) => {
      const owned = appids.map((id) => byId.get(id)).filter((g): g is Game => Boolean(g));
      const missing = appids.filter((id) => !byId.has(id)).map((id) => storeOnlyGame(id, lib.store[id]));
      return {
        name,
        hours: owned.reduce((s, g) => s + g.hours, 0),
        owned: owned.sort((a, b) => (a.releaseDate ?? 0) - (b.releaseDate ?? 0)),
        missing: missing.sort((a, b) => (a.releaseDate ?? 0) - (b.releaseDate ?? 0)),
        costToComplete: missing.reduce((s, g) => s + (g.price ?? 0), 0),
      };
    })
    .filter((s) => s.owned.length && s.owned.length + s.missing.length >= 2)
    .sort((a, b) => b.hours - a.hours);

  const studios = new Map<string, StudioView>();
  for (const g of games) {
    for (const dev of g.developers) {
      const s = studios.get(dev) ?? { name: dev, hours: 0, count: 0, played: 0, top: [] };
      s.hours += g.hours;
      s.count += 1;
      if (g.playtimeMin > 0) s.played += 1;
      s.top.push(g.appid);
      studios.set(dev, s);
    }
  }
  const studioList = [...studios.values()]
    .map((s) => ({ ...s, top: s.top.sort((a, b) => (byId.get(b)?.hours ?? 0) - (byId.get(a)?.hours ?? 0)).slice(0, 4) }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 12);

  return { series, studios: studioList };
}
