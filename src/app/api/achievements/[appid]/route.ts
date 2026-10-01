import { readAchievements } from "@/lib/achievements";
import { decodeEntities } from "@/lib/format";

export type AchievementDetail = {
  name: string;
  desc: string;
  icon: string;
  pct: number | null;
  unlockedAt: number | null;
};

/** Liste complète des succès d'un jeu, chargée à l'ouverture de sa fiche (trop lourd pour la page). */
export async function GET(_req: Request, ctx: RouteContext<"/api/achievements/[appid]">) {
  const { appid } = await ctx.params;
  const entry = (await readAchievements())[Number(appid)];
  if (!entry?.schema?.length) return Response.json([]);
  const list: AchievementDetail[] = entry.schema.map((a) => {
    const at = entry.unlocked[a.api] ?? null;
    return {
      name: decodeEntities(a.name),
      desc: a.hidden && !at ? "Succès caché" : decodeEntities(a.desc),
      icon: at ? a.icon : a.iconGray,
      pct: a.pct,
      unlockedAt: at,
    };
  });
  // Débloqués d'abord (les plus récents en tête), puis les manquants du plus courant au plus rare
  list.sort((a, b) =>
    a.unlockedAt && b.unlockedAt ? b.unlockedAt - a.unlockedAt : a.unlockedAt ? -1 : b.unlockedAt ? 1 : (b.pct ?? 0) - (a.pct ?? 0),
  );
  return Response.json(list);
}
