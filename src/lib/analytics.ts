import type { Game } from "./types";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function overview(games: Game[]) {
  const never = games.filter((g) => g.status === "never");
  const totalHours = sum(games.map((g) => g.hours));
  const value = sum(games.map((g) => g.fullPrice ?? 0));
  const top = games.reduce((a, b) => (b.hours > a.hours ? b : a), games[0]);
  const recent = games.filter((g) => g.hours2w > 0).sort((a, b) => b.hours2w - a.hours2w);
  return {
    count: games.length,
    totalHours,
    value,
    never,
    neverValue: sum(never.map((g) => g.fullPrice ?? 0)),
    costPerHour: totalHours ? value / totalHours : 0,
    top,
    recent,
    recentHours: sum(recent.map((g) => g.hours2w)),
  };
}

/**
 * Pour chaque tag : heures passées sur les jeux qui l'ont, et part de ton temps total.
 * Un jeu compte dans chacun de ses tags, donc les parts ne s'additionnent pas à 100 %.
 */
export function tagHours(games: Game[]) {
  const byTag = new Map<string, number>();
  for (const g of games) for (const tag of g.tags) byTag.set(tag, (byTag.get(tag) ?? 0) + g.hours);
  const total = sum(games.map((g) => g.hours));
  return [...byTag.entries()]
    .map(([tag, hours]) => ({ tag, hours, share: total ? hours / total : 0 }))
    .sort((a, b) => b.hours - a.hours);
}

/** Un tag doit apparaître sur au moins ce nombre de jeux pour qu'on en tire une préférence. */
export const MIN_TAG_GAMES = 3;

export type TagPreference = { tag: string; timeShare: number; gameShare: number; lift: number; score: number };

/**
 * Préférence par tag = part de ton temps sur ce tag ÷ part de ta bibliothèque qui a ce tag.
 * « Incrémental » sur 3 % de tes jeux mais 41 % de ton temps → lift ≈ 14 : tu adores.
 * « Indépendant » sur 60 % de tes jeux et 30 % de ton temps → lift 0,5 : rien de spécial.
 * Score 0–1 : 0,5 = neutre (lift 1), 1 = lift ≥ 4, 0 = lift ≤ 1/4 (échelle log).
 */
export function tagPreferences(games: Game[]): Map<string, TagPreference> {
  const totalHours = sum(games.map((g) => g.hours));
  const stats = new Map<string, { hours: number; count: number }>();
  for (const g of games) {
    for (const tag of g.tags) {
      const s = stats.get(tag) ?? { hours: 0, count: 0 };
      s.hours += g.hours;
      s.count += 1;
      stats.set(tag, s);
    }
  }
  const prefs = new Map<string, TagPreference>();
  if (!totalHours) return prefs;
  for (const [tag, { hours, count }] of stats) {
    if (count < MIN_TAG_GAMES) continue;
    const timeShare = hours / totalHours;
    const gameShare = count / games.length;
    const lift = timeShare / gameShare;
    const score = Math.min(1, Math.max(0, 0.5 + Math.log2(Math.max(lift, 1e-6)) / 4));
    prefs.set(tag, { tag, timeShare, gameShare, lift, score });
  }
  return prefs;
}

/** Note de départ pour un jeu sans (ou avec peu d')avis : le seuil « Plutôt positives » de Steam. */
export const REVIEW_PRIOR = 70;
/** Nombre d'avis fictifs à REVIEW_PRIOR ajoutés à chaque jeu (voir `adjustedRating`). */
export const REVIEW_PRIOR_WEIGHT = 200;

/**
 * Moyenne bayésienne : on ajoute à chaque jeu REVIEW_PRIOR_WEIGHT avis fictifs à REVIEW_PRIOR %.
 * 3 avis à 100 % → ≈ 70 % ; 300 000 avis à 95 % restent à 95 %.
 */
export function adjustedRating(pct: number | null, count: number) {
  if (pct == null || !count) return REVIEW_PRIOR;
  return (pct * count + REVIEW_PRIOR * REVIEW_PRIOR_WEIGHT) / (count + REVIEW_PRIOR_WEIGHT);
}

export type Reco = Game & { affinity: number; quality: number; rating: number; score: number; fav: TagPreference | null };

/**
 * Score explicable pour le backlog :
 *   affinité = moyenne des préférences (tagPreferences) sur les tags du jeu, 0,5 si aucun tag connu
 *   qualité  = évaluations Steam ajustées (adjustedRating), ramenées de 50–100 % à 0–1
 *   score    = w × affinité + (1 − w) × qualité
 */
export function recommend(games: Game[], weight: number, includeTasted: boolean): Reco[] {
  const prefs = tagPreferences(games);
  if (!prefs.size) return [];

  return games
    .filter((g) => g.tags.length && (g.status === "never" || (includeTasted && g.status === "tasted")))
    .map((g) => {
      const known = g.tags.map((t) => prefs.get(t)).filter((p): p is TagPreference => Boolean(p));
      const affinity = known.length ? sum(known.map((p) => p.score)) / known.length : 0.5;
      const fav = known.length ? known.reduce((a, b) => (b.lift > a.lift ? b : a)) : null;
      const rating = adjustedRating(g.reviewPct, g.reviewCount);
      const quality = Math.min(1, Math.max(0, (rating - 50) / 50));
      return { ...g, affinity, quality, rating, fav, score: 100 * (weight * affinity + (1 - weight) * quality) };
    })
    .sort((a, b) => b.score - a.score);
}

/** Courbe de Pareto : part cumulée des heures en fonction du nombre de jeux. */
export function pareto(games: Game[]) {
  const hours = games.filter((g) => g.hours > 0).map((g) => g.hours).sort((a, b) => b - a);
  const total = sum(hours);
  let acc = 0;
  const points = hours.map((h, i) => ({ n: i + 1, share: ((acc += h) / total) * 100 }));
  const n80 = (points.find((p) => p.share >= 80) ?? points.at(-1))?.n ?? 0;
  return { points, n80, played: hours.length };
}

export function playtimeBuckets(games: Game[]) {
  const buckets: [string, (h: number) => boolean][] = [
    ["Jamais", (h) => h === 0],
    ["< 2 h", (h) => h > 0 && h < 2],
    ["2–10 h", (h) => h >= 2 && h < 10],
    ["10–50 h", (h) => h >= 10 && h < 50],
    ["50–200 h", (h) => h >= 50 && h < 200],
    ["200 h +", (h) => h >= 200],
  ];
  return buckets.map(([label, test]) => ({ label, count: games.filter((g) => test(g.hours)).length }));
}

export function lastPlayedByYear(games: Game[]) {
  const years = new Map<number, number>();
  for (const g of games) {
    if (!g.lastPlayed || !g.playtimeMin) continue;
    const y = new Date(g.lastPlayed * 1000).getFullYear();
    years.set(y, (years.get(y) ?? 0) + 1);
  }
  return [...years.entries()].sort((a, b) => a[0] - b[0]).map(([year, count]) => ({ year: String(year), count }));
}

/** Jeux payants joués au moins 1 h, avec leur coût par heure (prix plein actuel ÷ heures). */
export function costPerHour(games: Game[]) {
  return games
    .filter((g) => (g.fullPrice ?? 0) > 0 && g.hours >= 1)
    .map((g) => ({ ...g, eurPerHour: (g.fullPrice as number) / g.hours }))
    .sort((a, b) => a.eurPerHour - b.eurPerHour);
}
