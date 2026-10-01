import { tagPreferences, type TagPreference } from "./analytics";
import type { AchievementsView } from "./achievements";
import type { Game } from "./types";

const DAY = 86400;

export type Trait = { id: string; label: string; emoji: string; rule: string };

export type ProfileView = {
  topTags: TagPreference[];
  traits: Trait[];
  medianPlayed: number; // heures, jeux joués
  abandonMedian: number | null; // heures, jeux lâchés
  abandonedCount: number;
  top3: number[];
};

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

/**
 * Chaque trait est une règle simple, affichée telle quelle : pas de classement caché.
 * « Lâché » = joué au moins 30 min, pas relancé depuis 6 mois, et moins de 50 % des succès s'il en a.
 */
export function profileView(games: Game[], ach: AchievementsView, nowUnix: number): ProfileView {
  const played = games.filter((g) => g.playtimeMin > 0);
  const total = played.reduce((s, g) => s + g.hours, 0);
  const sorted = [...played].sort((a, b) => b.hours - a.hours);
  const topShare = total ? sorted[0].hours / total : 0;
  const neverShare = games.length ? games.filter((g) => g.status === "never").length / games.length : 0;
  const medianPlayed = median(played.map((g) => g.hours));

  const abandoned = played.filter(
    (g) =>
      g.playtimeMin >= 30 &&
      g.lastPlayed > 0 &&
      nowUnix - g.lastPlayed > 180 * DAY &&
      (!g.ach || g.ach.unlocked / g.ach.total < 0.5),
  );

  const traits: Trait[] = [];
  const add = (cond: boolean, t: Trait) => cond && traits.push(t);
  add(topShare >= 0.2, { id: "mono", emoji: "💍", label: "Fidèle", rule: `${sorted[0]?.name} représente ${Math.round(topShare * 100)} % de ton temps (seuil : 20 %)` });
  add(neverShare >= 0.3, { id: "hoard", emoji: "🐉", label: "Collectionneur", rule: `${Math.round(neverShare * 100)} % de ta bibliothèque jamais lancée (seuil : 30 %)` });
  add(medianPlayed < 5, { id: "bee", emoji: "🐝", label: "Butineur", rule: `la moitié de tes jeux joués le sont moins de ${Math.round(medianPlayed * 10) / 10} h (seuil : 5 h)` });
  add(ach.perfect.length >= 5, { id: "hunter", emoji: "🏆", label: "Chasseur de succès", rule: `${ach.perfect.length} jeux complétés à 100 % (seuil : 5)` });
  add((ach.avgCompletion ?? 0) >= 0.5, { id: "finisher", emoji: "🎯", label: "Finisseur", rule: `${Math.round((ach.avgCompletion ?? 0) * 100)} % des succès en moyenne sur tes jeux commencés (seuil : 50 %)` });
  add(total >= 5000, { id: "veteran", emoji: "🧓", label: "Vétéran", rule: `${Math.round(total).toLocaleString("fr-FR")} heures au compteur (seuil : 5 000 h)` });
  add(played.filter((g) => g.multiplayer).reduce((s, g) => s + g.hours, 0) / (total || 1) >= 0.5, {
    id: "social", emoji: "🤝", label: "Joueur social", rule: "plus de la moitié de ton temps sur des jeux multijoueur",
  });

  return {
    topTags: [...tagPreferences(games).values()].filter((p) => p.lift > 1).sort((a, b) => b.lift - a.lift).slice(0, 5),
    traits,
    medianPlayed,
    abandonMedian: abandoned.length ? median(abandoned.map((g) => g.hours)) : null,
    abandonedCount: abandoned.length,
    top3: sorted.slice(0, 3).map((g) => g.appid),
  };
}
