import "server-only";
import { achievementSchema, playerAchievements } from "./steam";
import { decodeEntities } from "./format";
import { readJson, writeJson } from "./storage";
import type { AchEntry, AchievementsFile, AchSummary, OwnedGame, SyncEvent } from "./types";

const DAY = 86400;
const PARALLEL = 8;
const SCHEMA_TTL = 30 * DAY;

export const readAchievements = () => readJson<AchievementsFile>("achievements", {});

/**
 * Ne revérifie un jeu que si son temps de jeu a changé depuis la dernière fois (on ne peut pas débloquer
 * de succès sans jouer). Premier passage : tous les jeux joués, 8 en parallèle.
 */
export async function* syncAchievements(
  key: string, steamid: string, games: OwnedGame[], from: number, to: number,
): AsyncGenerator<SyncEvent> {
  const file = await readAchievements();
  const now = Math.floor(Date.now() / 1000);
  const todo = games.filter((g) => {
    const e = file[g.appid];
    return g.playtimeMin > 0 && (!e || e.playtimeAt !== g.playtimeMin || (e.schema && (e.schemaAt ?? 0) < now - SCHEMA_TTL));
  });
  if (!todo.length) return;

  for (let i = 0; i < todo.length; i += PARALLEL) {
    await Promise.all(
      todo.slice(i, i + PARALLEL).map(async (g) => {
        const unlocked = await playerAchievements(key, steamid, g.appid);
        const prev = file[g.appid];
        const entry: AchEntry = { checkedAt: now, playtimeAt: g.playtimeMin, unlocked: unlocked ?? {}, none: !unlocked };
        if (unlocked) {
          const fresh = prev?.schema && (prev.schemaAt ?? 0) >= now - SCHEMA_TTL;
          entry.schema = fresh ? prev.schema : await achievementSchema(key, g.appid);
          entry.schemaAt = fresh ? prev.schemaAt : now;
        }
        file[g.appid] = entry;
      }),
    );
    const done = Math.min(i + PARALLEL, todo.length);
    if (done % (PARALLEL * 5) === 0 || done === todo.length) await writeJson("achievements", file);
    yield { message: `Succès : ${done}/${todo.length} jeux vérifiés…`, progress: from + ((to - from) * done) / todo.length };
  }
}

export function achSummary(e: AchEntry | undefined): AchSummary | null {
  if (!e || e.none || !e.schema?.length) return null;
  const got = e.schema.filter((a) => e.unlocked[a.api]);
  const rarest = got.filter((a) => a.pct != null).sort((a, b) => (a.pct as number) - (b.pct as number))[0];
  return {
    total: e.schema.length,
    unlocked: got.length,
    lastUnlock: Math.max(0, ...Object.values(e.unlocked)),
    rarest: rarest ? { name: decodeEntities(rarest.name), pct: rarest.pct as number, icon: rarest.icon } : null,
  };
}

export type AchievementsView = {
  totalUnlocked: number;
  perfect: number[]; // appids à 100 %
  rarest: { appid: number; name: string; desc: string; icon: string; pct: number; at: number }[];
  almost: { appid: number; unlocked: number; total: number; missing: { name: string; icon: string; pct: number | null }[] }[];
  byMonth: { month: string; count: number }[];
  avgCompletion: number | null; // moyenne sur les jeux joués qui ont des succès
};

export function achievementsView(file: AchievementsFile): AchievementsView {
  const rarest: AchievementsView["rarest"] = [];
  const almost: AchievementsView["almost"] = [];
  const perfect: number[] = [];
  const months = new Map<string, number>();
  const completions: number[] = [];
  let totalUnlocked = 0;

  for (const [id, e] of Object.entries(file)) {
    if (e.none || !e.schema?.length) continue;
    const appid = Number(id);
    const got = e.schema.filter((a) => e.unlocked[a.api]);
    totalUnlocked += got.length;
    if (got.length) completions.push(got.length / e.schema.length);
    for (const a of got) {
      if (a.pct != null) rarest.push({ appid, name: decodeEntities(a.name), desc: decodeEntities(a.desc), icon: a.icon, pct: a.pct, at: e.unlocked[a.api] });
      const d = new Date(e.unlocked[a.api] * 1000);
      if (e.unlocked[a.api] > 0) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        months.set(key, (months.get(key) ?? 0) + 1);
      }
    }
    const ratio = got.length / e.schema.length;
    if (ratio === 1) perfect.push(appid);
    else if (ratio >= 0.75) {
      const missing = e.schema
        .filter((a) => !e.unlocked[a.api])
        .sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))
        .map((a) => ({ name: decodeEntities(a.hidden && !a.desc ? `${a.name} (caché)` : a.name), icon: a.iconGray, pct: a.pct }));
      almost.push({ appid, unlocked: got.length, total: e.schema.length, missing });
    }
  }

  // Mois continus, du premier succès à aujourd'hui (les mois vides comptent 0)
  const keys = [...months.keys()].sort();
  const byMonth: AchievementsView["byMonth"] = [];
  if (keys.length) {
    const [y0, m0] = keys[0].split("-").map(Number);
    const end = new Date();
    for (let y = y0, m = m0; y < end.getFullYear() || (y === end.getFullYear() && m <= end.getMonth() + 1); m === 12 ? (y++, (m = 1)) : m++) {
      const key = `${y}-${String(m).padStart(2, "0")}`;
      byMonth.push({ month: key, count: months.get(key) ?? 0 });
    }
  }

  return {
    totalUnlocked,
    perfect,
    rarest: rarest.sort((a, b) => a.pct - b.pct).slice(0, 12),
    almost: almost.sort((a, b) => b.unlocked / b.total - a.unlocked / a.total).slice(0, 12),
    byMonth,
    avgCompletion: completions.length ? completions.reduce((s, x) => s + x, 0) / completions.length : null,
  };
}
