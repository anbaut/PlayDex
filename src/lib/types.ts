/** Jeu tel que renvoyé par GetOwnedGames. */
export type OwnedGame = {
  appid: number;
  name: string;
  playtimeMin: number;
  playtime2wMin: number;
  lastPlayed: number; // timestamp unix, 0 = jamais
};

/** Fiche du Store Steam (IStoreBrowseService/GetItems), mise en cache. */
export type StoreInfo = {
  v: 2;
  fetchedAt: number;
  ok: boolean; // false = retiré du Store / introuvable
  name?: string;
  type?: number; // 0 = jeu, 4 = DLC…
  isFree?: boolean;
  priceCents?: number; // prix actuel, promo comprise
  fullPriceCents?: number;
  discountPct?: number;
  lowestRecentCents?: number; // plus bas prix récent selon Steam
  tags: string[]; // tags utilisateurs les plus votés, du plus au moins représentatif
  developers: string[];
  franchises: string[];
  multiplayer?: boolean;
  reviewPct?: number; // % d'évaluations positives
  reviewCount?: number;
  reviewLabel?: string; // « extrêmement positives »…
  releaseDate?: number; // timestamp unix
  headerImage?: string;
  heroImage?: string; // grande bannière de la bibliothèque Steam
  shortDesc?: string;
  earlyAccess?: boolean;
};

export type Profile = { persona: string; avatar?: string; steamid?: string };

export type WishItem = { appid: number; added: number; priority: number };

/** Contenu de data/library.json. */
export type LibraryFile = {
  source: "demo" | "steam";
  profile: Profile;
  syncedAt: number;
  games: OwnedGame[];
  wishlist?: WishItem[];
  store: Record<number, StoreInfo>; // fiches des jeux possédés, de la wishlist et des séries
};

// ---------------------------------------------------------------- caches annexes (data/*.json)

/** Photo des temps de jeu à une synchro. Encodage différentiel : seuls les jeux qui ont bougé. */
export type Snapshot = { t: number; synthetic?: boolean; p: Record<number, [minutes: number, lastPlayed: number]> };
export type HistoryFile = { snapshots: Snapshot[] };

export type AchDef = { api: string; name: string; desc: string; icon: string; iconGray: string; hidden: boolean; pct: number | null };
export type AchEntry = {
  checkedAt: number;
  playtimeAt: number; // temps de jeu lors de la vérification : on ne revérifie que s'il a changé
  none?: boolean; // le jeu n'a pas de succès
  unlocked: Record<string, number>; // apiname → date de déblocage
  schemaAt?: number;
  schema?: AchDef[];
};
export type AchievementsFile = Record<number, AchEntry>;

export type Friend = {
  steamid: string;
  name: string;
  avatar?: string;
  profileUrl?: string;
  since: number;
  isPublic: boolean;
  played: [appid: number, minutes: number][]; // jeux joués au moins une minute
  owned: number[]; // tous les jeux possédés
  recent: [appid: number, minutes2w: number, name: string][];
};
export type SocialFile = { fetchedAt: number; friends: Friend[] };

export type SeriesFile = Record<string, { fetchedAt: number; appids: number[] }>;

export type DurationEntry = { fetchedAt: number; hastily?: number; normally?: number; completely?: number; none?: boolean };
export type DurationsFile = Record<number, DurationEntry>;

// ---------------------------------------------------------------- vues pour l'affichage

export type Status = "never" | "tasted" | "played";

export type AchSummary = {
  total: number;
  unlocked: number;
  lastUnlock: number;
  rarest: { name: string; pct: number; icon: string } | null;
};

/** Durées IGDB en heures. */
export type Duration = { hastily: number | null; normally: number | null; completely: number | null };

/** Jeu + fiche Store, prêt pour l'affichage. */
export type Game = OwnedGame & {
  dexNo: number; // numéro dans le Playdex (ordre de sortie), 0 si non possédé
  hours: number;
  hours2w: number;
  status: Status;
  tags: string[];
  developers: string[];
  franchises: string[];
  multiplayer: boolean;
  price: number | null; // € actuels, null si plus vendu
  fullPrice: number | null;
  discountPct: number;
  lowestRecentPrice: number | null;
  isFree: boolean;
  reviewPct: number | null;
  reviewCount: number;
  reviewLabel: string | null;
  releaseDate: number | null;
  cover: string;
  hero: string | null;
  shortDesc: string | null;
  earlyAccess: boolean;
  ach: AchSummary | null;
  duration: Duration | null;
};

export type WishGame = Game & { added: number };

export type Library = {
  source: LibraryFile["source"];
  profile: Profile;
  syncedAt: number;
  games: Game[];
};

export type SyncEvent = { message: string; progress: number; warning?: boolean } | { error: string };
