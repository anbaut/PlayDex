import "server-only";
import { friendGames, friendList, playerSummaries } from "./steam";
import { readJson, writeJson } from "./storage";
import type { Friend, Game, SocialFile, SyncEvent } from "./types";

const PARALLEL = 8;

export const readSocial = () => readJson<SocialFile | null>("social", null);

export async function* syncFriends(key: string, steamid: string, from: number, to: number): AsyncGenerator<SyncEvent> {
  const list = await friendList(key, steamid);
  if (!list.length) {
    yield { message: "Liste d'amis privée ou vide : onglet Amis ignoré.", progress: to, warning: true };
    return;
  }
  const names = await playerSummaries(key, list.map((f) => f.steamid));
  const friends: Friend[] = [];
  for (let i = 0; i < list.length; i += PARALLEL) {
    await Promise.all(
      list.slice(i, i + PARALLEL).map(async (f) => {
        const games = await friendGames(key, f.steamid);
        const who = names.get(f.steamid);
        friends.push({
          steamid: f.steamid,
          name: who?.name ?? f.steamid,
          avatar: who?.avatar,
          profileUrl: who?.profileUrl,
          since: f.since,
          isPublic: Boolean(games),
          owned: (games ?? []).map((g) => g.appid),
          played: (games ?? []).filter((g) => g.playtime_forever > 0).map((g) => [g.appid, g.playtime_forever]),
          recent: (games ?? []).filter((g) => g.playtime_2weeks).map((g) => [g.appid, g.playtime_2weeks as number, g.name]),
        });
      }),
    );
    const done = Math.min(i + PARALLEL, list.length);
    yield { message: `Amis : ${done}/${list.length}…`, progress: from + ((to - from) * done) / list.length };
  }
  await writeJson("social", { fetchedAt: Math.floor(Date.now() / 1000), friends } satisfies SocialFile);
}

type FriendRef = { steamid: string; name: string; avatar?: string };

export type SocialView = {
  fetchedAt: number;
  friendCount: number;
  publicCount: number;
  nowPlaying: { appid: number; name: string; owned: boolean; friends: (FriendRef & { hours2w: number })[] }[];
  multi: { appid: number; friends: FriendRef[] }[];
  matches: (FriendRef & { profileUrl?: string; common: number; compat: number; topCommon: number[] })[];
};

/**
 * - « En ce moment » : jeux joués par tes amis ces 2 dernières semaines.
 * - « À plusieurs » : tes jeux multijoueur que des amis possèdent aussi.
 * - Compatibilité = jeux joués par vous deux ÷ jeux joués par au moins l'un de vous (indice de Jaccard).
 */
export function socialView(file: SocialFile, games: Game[]): SocialView {
  const mine = new Set(games.map((g) => g.appid));
  const myPlayed = new Set(games.filter((g) => g.playtimeMin > 0).map((g) => g.appid));
  const hoursOf = new Map(games.map((g) => [g.appid, g.hours]));
  const ref = (f: Friend): FriendRef => ({ steamid: f.steamid, name: f.name, avatar: f.avatar });

  const playing = new Map<number, SocialView["nowPlaying"][number]>();
  for (const f of file.friends) {
    for (const [appid, min2w, name] of f.recent) {
      const entry = playing.get(appid) ?? { appid, name, owned: mine.has(appid), friends: [] };
      entry.friends.push({ ...ref(f), hours2w: min2w / 60 });
      playing.set(appid, entry);
    }
  }

  const multi = games
    .filter((g) => g.multiplayer)
    .map((g) => ({ appid: g.appid, friends: file.friends.filter((f) => f.owned.includes(g.appid)).map(ref) }))
    .filter((m) => m.friends.length > 0)
    .sort((a, b) => b.friends.length - a.friends.length || (hoursOf.get(b.appid) ?? 0) - (hoursOf.get(a.appid) ?? 0))
    .slice(0, 16);

  const matches = file.friends
    .filter((f) => f.isPublic && f.played.length)
    .map((f) => {
      const theirs = new Set(f.played.map(([appid]) => appid));
      const common = [...theirs].filter((a) => myPlayed.has(a));
      const union = new Set([...theirs, ...myPlayed]).size;
      return {
        ...ref(f),
        profileUrl: f.profileUrl,
        common: common.length,
        compat: union ? common.length / union : 0,
        topCommon: common.sort((a, b) => (hoursOf.get(b) ?? 0) - (hoursOf.get(a) ?? 0)).slice(0, 5),
      };
    })
    .sort((a, b) => b.compat - a.compat);

  return {
    fetchedAt: file.fetchedAt,
    friendCount: file.friends.length,
    publicCount: file.friends.filter((f) => f.isPublic).length,
    nowPlaying: [...playing.values()]
      .sort((a, b) => b.friends.length - a.friends.length || b.friends[0].hours2w - a.friends[0].hours2w)
      .slice(0, 12),
    multi,
    matches,
  };
}
