import "server-only";
import type { AchDef, OwnedGame, Profile, StoreInfo, WishItem } from "./types";
import { decodeEntities } from "./format";

const API = "https://api.steampowered.com";
const ASSETS = "https://shared.steamstatic.com/store_item_assets/";
const LANG = { language: "french", country_code: "FR", steam_realm: 1 };
/** Au-delà de ~300 jeux par appel, l'URL devient trop longue et Steam renvoie 400. */
export const STORE_BATCH = 200;
/** Tags retenus par jeu, après filtrage. */
const TAGS_PER_GAME = 6;

/**
 * Tags qui décrivent le mode de jeu, la caméra ou le contenu plutôt que le genre.
 * Presque tous les jeux les ont : ils écraseraient les affinités (« Jeu solo » partout).
 */
const NOISE_TAGS = new Set([
  "Jeu solo", "Multijoueur", "Massivement multijoueur", "Coop", "Coop locale", "Coop en ligne", "Campagne en coop",
  "JcJ", "JcE", "Multijoueur local", "Multijoueur asynchrone", "4 personnes en local", "Écran partagé",
  "1ʳᵉ personne", "3ᵉ personne", "2D", "3D", "Pseudo 3D", "Contenu à caractère sexuel", "Nudité", "Violence", "Gore",
  "Atmosphère", "Beau", "Culte", "Moderne", "Modable", "Mod", "Rejouabilité", "Fins multiples", "Choix multiples",
  "Scénario riche", "Excellente bande-son", "Superbe bande-son", "Free-to-play", "Accès anticipé", "Court",
  "Protagoniste féminine", "Protagoniste sans voix", "Protagoniste détestable", "Compatible manette",
]);

/** Catégories Steam « joueurs » qui impliquent du jeu à plusieurs (multi, coop, JcJ, écran partagé, LAN…). */
const MULTIPLAYER_CATEGORIES = new Set([1, 9, 24, 27, 36, 37, 38, 39, 44, 47, 48, 49]);

export class SteamError extends Error {}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson(url: string, params: Record<string, string | number>, retries = 3) {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${url}?${qs}`, { cache: "no-store" });
    if (res.status === 401 || res.status === 403) {
      throw new SteamError("Clé API refusée par Steam : vérifie STEAM_API_KEY dans .env.local.");
    }
    if (res.status === 429 && attempt < retries) {
      await sleep(10_000 * attempt);
      continue;
    }
    if (!res.ok) throw new SteamError(`Steam a répondu ${res.status} sur ${url}.`);
    return res.json();
  }
}

/** Accepte un SteamID64, un pseudo d'URL personnalisée ou une URL de profil. */
export async function resolveSteamId(key: string, ident: string): Promise<string> {
  let id = ident.trim().replace(/\/+$/, "");
  const profile = id.match(/\/profiles\/(\d{17})/);
  if (profile) return profile[1];
  const vanity = id.match(/\/id\/([^/]+)/);
  if (vanity) id = vanity[1];
  if (/^\d{17}$/.test(id)) return id;
  const { response } = await getJson(`${API}/ISteamUser/ResolveVanityURL/v1/`, { key, vanityurl: id });
  if (response.success !== 1) throw new SteamError(`Profil Steam « ${id} » introuvable.`);
  return response.steamid;
}

export async function playerSummary(key: string, steamid: string): Promise<Profile> {
  const { response } = await getJson(`${API}/ISteamUser/GetPlayerSummaries/v2/`, { key, steamids: steamid });
  const p = response.players?.[0] ?? {};
  return { persona: p.personaname ?? steamid, avatar: p.avatarfull, steamid };
}

export async function ownedGames(key: string, steamid: string): Promise<OwnedGame[]> {
  const { response } = await getJson(`${API}/IPlayerService/GetOwnedGames/v1/`, {
    key, steamid, format: "json", include_appinfo: 1, include_played_free_games: 1,
  });
  if (!response.games) {
    throw new SteamError(
      "Steam ne renvoie aucun jeu : passe « Détails des jeux » en Public dans les paramètres de confidentialité du profil.",
    );
  }
  return response.games.map((g: Record<string, number | string>) => ({
    appid: g.appid as number,
    name: (g.name as string) ?? `App ${g.appid}`,
    playtimeMin: (g.playtime_forever as number) ?? 0,
    playtime2wMin: (g.playtime_2weeks as number) ?? 0,
    lastPlayed: (g.rtime_last_played as number) ?? 0,
  }));
}

/** Noms français des tags du Store (identifiant → nom). Pas besoin de clé. */
export async function tagNames(): Promise<Map<number, string>> {
  const { response } = await getJson(`${API}/IStoreService/GetTagList/v1/`, { language: LANG.language });
  return new Map((response.tags ?? []).map((t: { tagid: number; name: string }) => [t.tagid, t.name]));
}

/** Fiches Store d'un lot de jeux (≤ STORE_BATCH) en un seul appel. Pas besoin de clé. */
export async function storeItems(appids: number[], tags: Map<number, string>): Promise<Map<number, StoreInfo>> {
  const input = {
    ids: appids.map((appid) => ({ appid })),
    context: LANG,
    data_request: {
      include_assets: true, include_release: true, include_basic_info: true, include_reviews: true, include_tag_count: 20,
    },
  };
  const { response } = await getJson(`${API}/IStoreBrowseService/GetItems/v1/`, { input_json: JSON.stringify(input) });
  const fetchedAt = Math.floor(Date.now() / 1000);
  const out = new Map<number, StoreInfo>();
  for (const item of response.store_items ?? []) out.set(item.id, parseItem(item, tags, fetchedAt));
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseItem(item: any, tagMap: Map<number, string>, fetchedAt: number): StoreInfo {
  const empty = { v: 2 as const, fetchedAt, tags: [], developers: [], franchises: [] };
  if (item.success !== 1) return { ...empty, ok: false };

  const bpo = item.best_purchase_option;
  const cents = (s?: string) => (s == null ? undefined : Number(s));
  const asset = (file?: string) =>
    file && item.assets?.asset_url_format ? ASSETS + item.assets.asset_url_format.replace("${FILENAME}", file) : undefined;
  const review = item.reviews?.summary_filtered;
  const tags = (item.tags ?? [])
    .map((t: { tagid: number }) => tagMap.get(t.tagid))
    .filter((name: string | undefined): name is string => Boolean(name) && !NOISE_TAGS.has(name!))
    .slice(0, TAGS_PER_GAME);

  const players: number[] = item.categories?.supported_player_categoryids ?? [];
  return {
    ...empty,
    ok: true,
    name: item.name,
    type: item.type,
    multiplayer: players.some((c) => MULTIPLAYER_CATEGORIES.has(c)),
    isFree: Boolean(item.is_free),
    priceCents: cents(bpo?.final_price_in_cents),
    fullPriceCents: cents(bpo?.original_price_in_cents) ?? cents(bpo?.final_price_in_cents),
    discountPct: bpo?.discount_pct ?? 0,
    lowestRecentCents: cents(bpo?.lowest_recent_price_in_cents),
    tags,
    developers: (item.basic_info?.developers ?? []).map((d: { name: string }) => d.name),
    franchises: (item.basic_info?.franchises ?? []).map((f: { name: string }) => f.name),
    reviewPct: review?.review_count ? review.percent_positive : undefined,
    reviewCount: review?.review_count,
    reviewLabel: review?.review_count ? review.review_score_label : undefined,
    releaseDate: item.release?.steam_release_date,
    headerImage: asset(item.assets?.header),
    heroImage: asset(item.assets?.library_hero),
    shortDesc: item.basic_info?.short_description,
    earlyAccess: Boolean(item.is_early_access),
  };
}

// ---------------------------------------------------------------- appels « tolérants »
// Ces endpoints échouent normalement pour certains jeux ou profils (pas de succès, profil privé…) :
// on renvoie null au lieu de lever une erreur.

async function tryJson(url: string, params: Record<string, string | number>) {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(`${url}?${qs}`, { cache: "no-store" });
    if (res.status === 429) {
      await sleep(5_000 * attempt);
      continue;
    }
    if (!res.ok) return null;
    try {
      return await res.json();
    } catch {
      return null;
    }
  }
  return null;
}

/** Wishlist publique (pas besoin de clé). Vide si elle est privée. */
export async function wishlist(steamid: string): Promise<WishItem[]> {
  const data = await tryJson(`${API}/IWishlistService/GetWishlist/v1/`, { steamid });
  return (data?.response?.items ?? []).map((i: { appid: number; date_added: number; priority: number }) => ({
    appid: i.appid, added: i.date_added, priority: i.priority,
  }));
}

/** Succès débloqués (apiname → date), ou null si le jeu n'en a pas. */
export async function playerAchievements(key: string, steamid: string, appid: number): Promise<Record<string, number> | null> {
  const data = await tryJson(`${API}/ISteamUserStats/GetPlayerAchievements/v1/`, { key, steamid, appid });
  const list = data?.playerstats?.achievements;
  if (!list?.length) return null;
  const unlocked: Record<string, number> = {};
  for (const a of list) if (a.achieved) unlocked[a.apiname] = a.unlocktime;
  return unlocked;
}

/** Liste des succès d'un jeu (noms, descriptions, icônes) et % de joueurs qui ont chacun. */
export async function achievementSchema(key: string, appid: number): Promise<AchDef[]> {
  const [schema, global] = await Promise.all([
    tryJson(`${API}/ISteamUserStats/GetSchemaForGame/v2/`, { key, appid, l: "french" }),
    tryJson(`${API}/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/`, { gameid: appid }),
  ]);
  const pct = new Map<string, number>(
    (global?.achievementpercentages?.achievements ?? []).map((a: { name: string; percent: string | number }) => [a.name, Number(a.percent)]),
  );
  return (schema?.game?.availableGameStats?.achievements ?? []).map(
    (a: { name: string; displayName: string; description?: string; icon: string; icongray: string; hidden: number }) => ({
      api: a.name,
      name: decodeEntities(a.displayName),
      desc: decodeEntities(a.description ?? ""),
      icon: a.icon,
      iconGray: a.icongray,
      hidden: a.hidden === 1,
      pct: pct.get(a.name) ?? null,
    }),
  );
}

/** Amis Steam (vide si la liste d'amis est privée). */
export async function friendList(key: string, steamid: string): Promise<{ steamid: string; since: number }[]> {
  const data = await tryJson(`${API}/ISteamUser/GetFriendList/v1/`, { key, steamid, relationship: "friend" });
  return (data?.friendslist?.friends ?? []).map((f: { steamid: string; friend_since: number }) => ({ steamid: f.steamid, since: f.friend_since }));
}

/** Pseudos et avatars, par lots de 100. */
export async function playerSummaries(key: string, steamids: string[]) {
  const out = new Map<string, { name: string; avatar?: string; profileUrl?: string }>();
  for (let i = 0; i < steamids.length; i += 100) {
    const data = await tryJson(`${API}/ISteamUser/GetPlayerSummaries/v2/`, { key, steamids: steamids.slice(i, i + 100).join(",") });
    for (const p of data?.response?.players ?? []) out.set(p.steamid, { name: p.personaname, avatar: p.avatarfull, profileUrl: p.profileurl });
  }
  return out;
}

/** Bibliothèque d'un ami, ou null si elle est privée. */
export async function friendGames(key: string, steamid: string) {
  const data = await tryJson(`${API}/IPlayerService/GetOwnedGames/v1/`, {
    key, steamid, include_appinfo: 1, include_played_free_games: 1,
  });
  const games = data?.response?.games;
  if (!games) return null;
  return games as { appid: number; name: string; playtime_forever: number; playtime_2weeks?: number }[];
}

/** Recherche Store par nom (≈ 10 résultats). Sert à retrouver les jeux d'une série. */
export async function storeSearch(term: string): Promise<number[]> {
  const res = await fetch(
    `https://store.steampowered.com/api/storesearch/?${new URLSearchParams({ term, l: "french", cc: "FR" })}`,
    { cache: "no-store" },
  );
  if (!res.ok) return [];
  const data = await res.json().catch(() => null);
  return (data?.items ?? []).filter((i: { type: string }) => i.type === "app").map((i: { id: number }) => i.id);
}
