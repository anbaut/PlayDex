import "server-only";
import { readJson, writeJson } from "./storage";
import type { HistoryFile, OwnedGame } from "./types";

const DAY = 86400;

/** Rejoue les deltas pour obtenir l'état complet (minutes, dernière partie) à chaque photo. */
function replay(file: HistoryFile) {
  const state = new Map<number, [number, number]>();
  return file.snapshots.map((snap) => {
    for (const [appid, v] of Object.entries(snap.p)) state.set(Number(appid), v);
    return { t: snap.t, synthetic: Boolean(snap.synthetic), state: new Map(state) };
  });
}

/**
 * Ajoute une photo des temps de jeu. Seuls les jeux qui ont bougé depuis la précédente sont écrits.
 * Première photo : on en fabrique une seconde, 14 jours plus tôt, grâce au temps de jeu des 2 dernières
 * semaines que donne Steam. La courbe démarre ainsi avec un vrai point au lieu d'être vide.
 */
export async function recordSnapshot(games: OwnedGame[], now: number): Promise<void> {
  const file = await readJson<HistoryFile>("history", { snapshots: [] });

  if (!file.snapshots.length) {
    const before = now - 14 * DAY;
    const p: HistoryFile["snapshots"][number]["p"] = {};
    for (const g of games) {
      const minutes = g.playtimeMin - g.playtime2wMin;
      if (minutes > 0 || g.playtime2wMin > 0) p[g.appid] = [minutes, g.playtime2wMin ? Math.min(g.lastPlayed, before) : g.lastPlayed];
    }
    file.snapshots.push({ t: before, synthetic: true, p });
  }

  const last = replay(file).at(-1)?.state ?? new Map();
  const p: HistoryFile["snapshots"][number]["p"] = {};
  for (const g of games) {
    const prev = last.get(g.appid);
    if (!prev ? g.playtimeMin > 0 : prev[0] !== g.playtimeMin || prev[1] !== g.lastPlayed) {
      p[g.appid] = [g.playtimeMin, g.lastPlayed];
    }
  }
  if (Object.keys(p).length || file.snapshots.length === 1) file.snapshots.push({ t: now, p });
  await writeJson("history", file);
}

export type HistoryView = {
  since: number | null;
  snapshots: number;
  weeks: { week: number; hours: number }[]; // lundi de la semaine (unix), heures jouées
  recent: { appid: number; hours: number }[]; // 30 derniers jours
  comebacks: { appid: number; gapDays: number; at: number }[];
};

const mondayOf = (t: number) => {
  const d = new Date(t * 1000);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return Math.floor(d.getTime() / 1000);
};

/**
 * Heures par semaine : entre deux photos, les minutes gagnées sont réparties uniformément sur chaque
 * jour de l'intervalle (on ne sait pas quel jour exact tu as joué).
 */
export async function historyView(now: number): Promise<HistoryView> {
  const snaps = replay(await readJson<HistoryFile>("history", { snapshots: [] }));
  const weeks = new Map<number, number>();
  const recent = new Map<number, number>();
  const comebacks: HistoryView["comebacks"] = [];

  for (let i = 1; i < snaps.length; i++) {
    const a = snaps[i - 1];
    const b = snaps[i];
    const span = Math.max(b.t - a.t, 1);
    const days = Math.max(1, Math.round(span / DAY));
    const recentFraction = Math.max(0, Math.min(1, (b.t - Math.max(a.t, now - 30 * DAY)) / span));
    let total = 0;
    for (const [appid, [minutes, lastPlayed]] of b.state) {
      const [prevMin, prevLast] = a.state.get(appid) ?? [0, 0];
      const delta = minutes - prevMin;
      if (delta > 0) {
        total += delta;
        if (recentFraction > 0) recent.set(appid, (recent.get(appid) ?? 0) + (delta * recentFraction) / 60);
      }
      // Revenant : relancé après plus d'un an sans y toucher
      if (prevLast && lastPlayed > prevLast && lastPlayed - prevLast > 365 * DAY) {
        comebacks.push({ appid, gapDays: Math.round((lastPlayed - prevLast) / DAY), at: lastPlayed });
      }
    }
    for (let d = 0; d < days; d++) {
      const w = mondayOf(a.t + (d + 0.5) * (span / days));
      weeks.set(w, (weeks.get(w) ?? 0) + total / 60 / days);
    }
  }

  return {
    since: snaps[0]?.t ?? null,
    snapshots: snaps.filter((s) => !s.synthetic).length,
    weeks: [...weeks.entries()].sort((x, y) => x[0] - y[0]).map(([week, hours]) => ({ week, hours })),
    recent: [...recent.entries()].map(([appid, hours]) => ({ appid, hours })).sort((x, y) => y.hours - x.hours).slice(0, 8),
    comebacks: comebacks.sort((x, y) => y.at - x.at).slice(0, 8),
  };
}
