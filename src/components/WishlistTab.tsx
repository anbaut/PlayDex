"use client";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { adjustedRating, tagPreferences } from "@/lib/analytics";
import { eur } from "@/lib/format";
import type { Game, WishGame } from "@/lib/types";
import { Badge, Cover, Empty, ratingTone, SectionTitle } from "./ui";

/** En promo ET au plus bas prix récent connu de Steam. */
export const isDeal = (g: Game) =>
  g.discountPct > 0 && g.price != null && g.lowestRecentPrice != null && g.price <= g.lowestRecentPrice;

type Scored = WishGame & { affinity: number; quality: number; score: number };

const SORTS: Record<string, (a: Scored, b: Scored) => number> = {
  "Score d'achat": (a, b) => b.score - a.score,
  "Remise": (a, b) => b.discountPct - a.discountPct,
  "Prix": (a, b) => (a.price ?? 1e9) - (b.price ?? 1e9),
  "Ajout récent": (a, b) => b.added - a.added,
};

/**
 * Score d'achat = 40 % affinité (tes tags, comme « À jouer ») + 30 % qualité (avis Steam ajustés)
 * + 30 % remise en cours. Tout est affiché sur la carte.
 */
export default function WishlistTab({ games, wishlist, onOpen }: { games: Game[]; wishlist: WishGame[]; onOpen: (g: Game) => void }) {
  const [sort, setSort] = useState("Score d'achat");
  const scored = useMemo(() => {
    const prefs = tagPreferences(games);
    return wishlist.map((g): Scored => {
      const known = g.tags.map((t) => prefs.get(t)).filter((p) => p != null);
      const affinity = known.length ? known.reduce((s, p) => s + p.score, 0) / known.length : 0.5;
      const quality = Math.min(1, Math.max(0, (adjustedRating(g.reviewPct, g.reviewCount) - 50) / 50));
      return { ...g, affinity, quality, score: 100 * (0.4 * affinity + 0.3 * quality + 0.3 * (g.discountPct / 100)) };
    });
  }, [games, wishlist]);
  const sorted = [...scored].sort(SORTS[sort]);
  const deals = scored.filter(isDeal);

  if (!wishlist.length) {
    return <Empty>Wishlist vide ou privée. Pour qu&apos;elle apparaisse, rends-la publique dans les paramètres de confidentialité Steam, puis resynchronise.</Empty>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle title="Wishlist">
          <b>{wishlist.length} jeux</b> en attente. Score d&apos;achat = 40 % affinité avec tes tags + 30 % qualité (avis Steam)
          + 30 % remise en cours.
        </SectionTitle>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="glass mb-6 cursor-pointer rounded-full px-4 py-2.5 text-sm font-semibold outline-none" aria-label="Trier par">
          {Object.keys(SORTS).map((s) => <option key={s} className="bg-panel">{s}</option>)}
        </select>
      </div>

      {deals.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/[.07] p-5">
          <div className="font-semibold text-emerald-300">🔥 {deals.length} jeu{deals.length > 1 ? "x" : ""} au plus bas prix récent en ce moment</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {deals.map((g) => (
              <button key={g.appid} onClick={() => onOpen(g)} className="rounded-full border border-emerald-500/30 px-3 py-1 text-sm hover:bg-emerald-500/10">
                {g.name} · <b>{eur(g.price ?? 0, 2)}</b> <span className="text-emerald-300">-{g.discountPct}%</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
        {sorted.map((g, i) => (
          <motion.button
            key={g.appid}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 20) * 0.015 } }}
            onClick={() => onOpen(g)}
            className="group overflow-hidden rounded-2xl border border-line bg-panel text-left transition hover:-translate-y-1 hover:border-accent/50"
          >
            <div className="relative">
              <Cover src={g.cover} alt={g.name} className="aspect-[460/215]" />
              <span className="bg-gradient-accent absolute top-2 left-2 rounded-md px-2 py-0.5 text-xs font-bold text-white shadow-lg">{Math.round(g.score)}</span>
              {g.discountPct > 0 && <span className="absolute top-2 right-2 rounded-md bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">-{g.discountPct}%</span>}
            </div>
            <div className="p-3.5">
              <div className="truncate font-semibold">{g.name}</div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="font-display text-xl font-bold">{g.isFree ? "Gratuit" : g.price != null ? eur(g.price, 2) : "Pas en vente"}</span>
                {g.discountPct > 0 && g.fullPrice != null && <span className="text-sm text-muted line-through">{eur(g.fullPrice, 2)}</span>}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {isDeal(g) && <Badge tone="good">Plus bas récent</Badge>}
                {g.reviewPct != null && <Badge tone={ratingTone(g.reviewPct)}>👍 {g.reviewPct} %</Badge>}
                <Badge>Affinité {Math.round(g.affinity * 100)}</Badge>
              </div>
              <div className="mt-2 text-[11px] text-muted">Ajouté le {new Date(g.added * 1000).toLocaleDateString("fr-FR")}</div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
