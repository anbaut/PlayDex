"use client";
import { AnimatePresence, motion } from "motion/react";
import { ExternalLink, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { AchievementDetail } from "@/app/api/achievements/[appid]/route";
import { ago, dexNo, eur, hrs, num, storeUrl } from "@/lib/format";
import type { Game } from "@/lib/types";
import { Badge, Bar, Cover, ratingTone } from "./ui";

/** Fiche détaillée d'un jeu, en surimpression. */
export default function GameModal({ game, onClose }: { game: Game | null; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      {game && (
        <motion.div
          className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-label={game.name}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="relative max-h-[90vh] w-full max-w-2xl overflow-x-hidden overflow-y-auto rounded-3xl border border-line bg-panel shadow-2xl shadow-black/70"
          >
            <div className="relative">
              <Cover src={game.hero ?? game.cover} alt={game.name} className={game.hero ? "aspect-[31/12]" : "aspect-[460/215]"} />
              <div className="absolute inset-0 bg-gradient-to-t from-panel via-panel/20 to-transparent" />
              <button
                onClick={onClose}
                aria-label="Fermer"
                className="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-black/70"
              >
                <X className="size-4" />
              </button>
              <div className="absolute right-6 bottom-3 left-6 drop-shadow-lg">
                {game.dexNo > 0 && <div className="font-mono text-xs font-semibold text-accent-2">{dexNo(game.dexNo)}</div>}
                <h3 className="font-display text-3xl font-bold tracking-tight">{game.name}</h3>
              </div>
            </div>

            <div className="px-6 pt-3 pb-6">
              <div className="flex flex-wrap gap-1.5">
                {game.tags.map((t) => <Badge key={t}>{t}</Badge>)}
                {game.earlyAccess && <Badge tone="amber">Accès anticipé</Badge>}
              </div>
              {game.reviewPct != null && (
                <p className="mt-3 text-sm text-muted">
                  <Badge tone={ratingTone(game.reviewPct)}>👍 {game.reviewPct} %</Badge>{" "}
                  Évaluations <b className="text-ink">{game.reviewLabel}</b> sur {num(game.reviewCount)} avis
                </p>
              )}
              {game.shortDesc && <p className="mt-4 text-sm leading-relaxed text-muted">{game.shortDesc}</p>}

              <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Temps de jeu" value={hrs(game.hours)} />
                <Stat label="Dernière partie" value={ago(game.lastPlayed)} />
                <Stat
                  label="Prix actuel"
                  value={game.isFree ? "Gratuit" : game.price != null ? eur(game.price, 2) : "Plus vendu"}
                  sub={
                    game.discountPct > 0 && game.fullPrice
                      ? `au lieu de ${eur(game.fullPrice, 2)}`
                      : game.lowestRecentPrice != null && game.price != null && game.lowestRecentPrice < game.price
                        ? `déjà vu à ${eur(game.lowestRecentPrice, 2)}`
                        : undefined
                  }
                />
                <Stat
                  label="Coût par heure"
                  value={game.fullPrice && game.hours >= 1 ? eur(game.fullPrice / game.hours, 2) : "–"}
                  sub={game.fullPrice && game.hours >= 1 ? "prix plein ÷ heures" : undefined}
                />
              </dl>

              {game.duration && (
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 rounded-xl border border-line bg-white/[.02] px-3 py-2.5 text-sm">
                  <span className="text-[11px] font-semibold tracking-wider text-muted uppercase">Pour finir (IGDB)</span>
                  {game.duration.hastily != null && <span>Histoire : <b>{hrs(game.duration.hastily)}</b></span>}
                  {game.duration.normally != null && <span>Normal : <b>{hrs(game.duration.normally)}</b></span>}
                  {game.duration.completely != null && <span>100 % : <b>{hrs(game.duration.completely)}</b></span>}
                </div>
              )}

              {game.ach && <ModalAchievements key={game.appid} appid={game.appid} unlocked={game.ach.unlocked} total={game.ach.total} />}

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
                <span>
                  {[
                    game.releaseDate && `Sorti en ${new Date(game.releaseDate * 1000).getFullYear()}`,
                    game.developers.length > 0 && game.developers.join(", "),
                    game.franchises.length > 0 && `Série ${game.franchises[0]}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                <a
                  href={storeUrl(game.appid)}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-gradient-accent inline-flex items-center gap-2 rounded-full px-4 py-2 font-semibold text-white shadow-lg shadow-accent/25 transition hover:brightness-110"
                >
                  Voir sur le Store <ExternalLink className="size-4" />
                </a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white/[.02] px-3 py-2.5">
      <dt className="text-[11px] font-semibold tracking-wider text-muted uppercase">{label}</dt>
      <dd className="mt-1 font-display text-lg font-bold tabular-nums">{value}</dd>
      {sub && <dd className="text-[11px] text-muted">{sub}</dd>}
    </div>
  );
}

function ModalAchievements({ appid, unlocked, total }: { appid: number; unlocked: number; total: number }) {
  const [list, setList] = useState<AchievementDetail[] | null>(null);
  const [showAll, setShowAll] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch(`/api/achievements/${appid}`)
      .then((r) => r.json())
      .then((data) => alive && setList(data));
    return () => {
      alive = false;
    };
  }, [appid]);

  const shown = showAll ? list : list?.slice(0, 8);
  return (
    <div className="mt-5">
      <div className="flex items-center gap-3 text-sm">
        <span className="font-semibold">Succès</span>
        <Bar value={unlocked / total} className="flex-1" />
        <span className="text-muted tabular-nums">{unlocked}/{total}</span>
      </div>
      {!list ? (
        <p className="mt-3 text-xs text-muted">Chargement…</p>
      ) : (
        <>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {shown?.map((a) => (
              <li key={a.name + a.icon} className={`flex items-center gap-2.5 rounded-lg p-1.5 ${a.unlockedAt ? "" : "opacity-60"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.icon} alt="" className="size-9 shrink-0 rounded" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{a.name}</div>
                  <div className="truncate text-[11px] text-muted">{a.desc}</div>
                </div>
                {a.pct != null && <span className="shrink-0 text-[11px] text-muted tabular-nums">{a.pct.toLocaleString("fr-FR")} %</span>}
              </li>
            ))}
          </ul>
          {list.length > 8 && (
            <button onClick={() => setShowAll((v) => !v)} className="mt-2 text-xs font-semibold text-accent-2 hover:underline">
              {showAll ? "Réduire" : `Voir les ${list.length} succès`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
