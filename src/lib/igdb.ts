import "server-only";
import { readJson, writeJson } from "./storage";
import type { DurationsFile, OwnedGame, SyncEvent } from "./types";

/*
 * Durées « pour finir » depuis IGDB (base de données de Twitch, API officielle et gratuite).
 * HowLongToBeat n'a pas d'API publique : IGDB fournit l'équivalent (game_time_to_beats).
 * Nécessite IGDB_CLIENT_ID et IGDB_CLIENT_SECRET (application sur dev.twitch.tv).
 */

const DAY = 86400;
const RETRY_NONE_AFTER = 30 * DAY;
const BATCH = 400; // IGDB accepte 500 résultats max par requête
const STEAM_SOURCE = 1; // source « Steam » dans external_games

async function token(): Promise<string> {
  const qs = new URLSearchParams({
    client_id: process.env.IGDB_CLIENT_ID!,
    client_secret: process.env.IGDB_CLIENT_SECRET!,
    grant_type: "client_credentials",
  });
  const res = await fetch(`https://id.twitch.tv/oauth2/token?${qs}`, { method: "POST", cache: "no-store" });
  if (!res.ok) throw new Error("Identifiants IGDB refusés : vérifie IGDB_CLIENT_ID et IGDB_CLIENT_SECRET.");
  return (await res.json()).access_token;
}

async function query(accessToken: string, endpoint: string, body: string) {
  const res = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: "POST",
    cache: "no-store",
    headers: { "Client-ID": process.env.IGDB_CLIENT_ID!, Authorization: `Bearer ${accessToken}` },
    body,
  });
  if (!res.ok) throw new Error(`IGDB ${endpoint} : ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

/** Steam appid → identifiant IGDB. Le champ de source a changé de nom en 2025 : on essaie les deux. */
async function igdbIds(accessToken: string, appids: number[]): Promise<Map<number, number>> {
  const uids = appids.map((a) => `"${a}"`).join(",");
  let rows: { game: number; uid: string }[];
  try {
    rows = await query(accessToken, "external_games", `fields game,uid; where external_game_source = ${STEAM_SOURCE} & uid = (${uids}); limit 500;`);
  } catch {
    rows = await query(accessToken, "external_games", `fields game,uid; where category = ${STEAM_SOURCE} & uid = (${uids}); limit 500;`);
  }
  return new Map(rows.filter((r) => r.game).map((r) => [Number(r.uid), r.game]));
}

export async function* syncDurations(games: OwnedGame[], from: number, to: number): AsyncGenerator<SyncEvent> {
  const file = await readJson<DurationsFile>("durations", {});
  const now = Math.floor(Date.now() / 1000);
  const todo = games
    .map((g) => g.appid)
    .filter((id) => !file[id] || (file[id].none && file[id].fetchedAt < now - RETRY_NONE_AFTER));
  if (!todo.length) return;

  const accessToken = await token();
  for (let i = 0; i < todo.length; i += BATCH) {
    const chunk = todo.slice(i, i + BATCH);
    const ids = await igdbIds(accessToken, chunk);
    const times = new Map<number, { hastily?: number; normally?: number; completely?: number }>();
    if (ids.size) {
      const rows = await query(
        accessToken, "game_time_to_beats",
        `fields game_id,hastily,normally,completely; where game_id = (${[...ids.values()].join(",")}); limit 500;`,
      );
      for (const r of rows) times.set(r.game_id, r);
    }
    for (const appid of chunk) {
      const t = times.get(ids.get(appid) ?? -1);
      // IGDB donne des secondes
      file[appid] = t && (t.normally || t.hastily || t.completely)
        ? { fetchedAt: now, hastily: t.hastily, normally: t.normally, completely: t.completely }
        : { fetchedAt: now, none: true };
    }
    const done = Math.min(i + BATCH, todo.length);
    yield { message: `Durées IGDB : ${done}/${todo.length}…`, progress: from + ((to - from) * done) / todo.length };
  }
  await writeJson("durations", file);
}

export const readDurations = () => readJson<DurationsFile>("durations", {});
