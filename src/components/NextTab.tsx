"use client";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { MIN_TAG_GAMES, recommend, REVIEW_PRIOR, REVIEW_PRIOR_WEIGHT } from "@/lib/analytics";
import { hrs, num, pct } from "@/lib/format";
import type { Game } from "@/lib/types";
import { Cover, SectionTitle } from "./ui";

const spring = { type: "spring", stiffness: 260, damping: 30 } as const;

export default function NextTab({ games, onOpen }: { games: Game[]; onOpen: (g: Game) => void }) {
  const [weight, setWeight] = useState(60);
  const [includeTasted, setIncludeTasted] = useState(true);
  const recos = useMemo(() => recommend(games, weight / 100, includeTasted).slice(0, 10), [games, weight, includeTasted]);

  return (
    <div>
      <SectionTitle title="Quoi jouer ensuite ?">
        Un score simple et transparent, calculé sur ton backlog : <b>ce que tu aimes</b> (tes heures passées par tag Steam)
        croisé avec <b>la qualité du jeu</b> (les évaluations des joueurs Steam). Pas de boîte noire : bouge le curseur et
        regarde le classement bouger.
      </SectionTitle>

      <div className="glass mb-6 flex flex-wrap items-center gap-x-8 gap-y-4 rounded-2xl px-5 py-4">
        <label className="flex min-w-72 flex-1 flex-col gap-2.5">
          <span className="flex justify-between text-sm">
            <span>Affinité <b className="text-accent-2 tabular-nums">{weight} %</b></span>
            <span className="text-muted">Qualité <b className="text-ink tabular-nums">{100 - weight} %</b></span>
          </span>
          <input
            type="range" min={0} max={100} step={5} value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            className="slider w-full"
            style={{ ["--fill" as string]: `${weight}%` }}
          />
        </label>
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <button
            role="switch"
            aria-checked={includeTasted}
            onClick={() => setIncludeTasted((v) => !v)}
            className={`relative h-6 w-11 rounded-full transition-colors ${includeTasted ? "bg-accent" : "bg-white/10"}`}
          >
            <motion.span layout transition={spring} className={`absolute top-1 size-4 rounded-full bg-white ${includeTasted ? "right-1" : "left-1"}`} />
          </button>
          Inclure les jeux goûtés (&lt; 2 h)
        </label>
      </div>

      {recos.length === 0 ? (
        <p className="text-muted">Pas assez de données : il faut des jeux joués et des fiches Store synchronisées.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {recos.map((r, i) => (
            <motion.button
              layout
              key={r.appid}
              transition={spring}
              onClick={() => onOpen(r)}
              className={`group grid w-full cursor-pointer grid-cols-[36px_1fr] items-center gap-4 rounded-2xl border p-3.5 text-left transition-colors md:grid-cols-[40px_240px_1fr_110px] md:gap-5 ${i === 0 ? "border-accent/40 bg-gradient-to-r from-accent/15 to-panel to-60%" : "border-line bg-panel hover:border-accent/40"}`}
            >
              <div className="text-center font-display text-2xl font-bold text-muted">{i + 1}</div>
              <Cover src={r.cover} alt={r.name} className="hidden aspect-[460/215] rounded-xl md:block" />
              <div className="min-w-0">
                <div className="truncate text-[17px] font-bold">{r.name}</div>
                <p className="mt-1 mb-3 text-[13.5px] text-muted [&_b]:font-semibold [&_b]:text-ink">
                  {r.fav ? (
                    <>
                      « <b>{r.fav.tag}</b> » : {pct(r.fav.gameShare)} de ta bibliothèque, mais <b>{pct(r.fav.timeShare)}</b> de ton temps
                    </>
                  ) : (
                    "Aucun de ses tags n'est assez présent chez toi pour juger"
                  )}
                  {r.reviewPct != null ? (
                    <>
                      . Évalué <b>{r.reviewPct} %</b> positif sur {num(r.reviewCount)} avis
                      {Math.abs(r.rating - r.reviewPct) >= 2 && <> (ajusté à {Math.round(r.rating)} % selon le nombre d&apos;avis)</>}
                    </>
                  ) : (
                    <>. Aucune évaluation : compté {REVIEW_PRIOR} %</>
                  )}
                  {r.playtimeMin > 0 && <>. Déjà lancé {hrs(r.hours)}</>}.
                </p>
                <div className="grid max-w-xl grid-cols-[130px_1fr_30px] items-center gap-x-3 gap-y-1.5 text-xs text-muted">
                  <ScoreBar label="Affinité tags" value={r.affinity} />
                  <ScoreBar label="Qualité (avis Steam)" value={r.quality} />
                </div>
              </div>
              <div className="col-start-2 font-display text-4xl font-bold tabular-nums md:col-start-auto md:text-right">
                {Math.round(r.score)}
                <span className="block font-sans text-xs font-medium text-muted">/ 100</span>
              </div>
            </motion.button>
          ))}
        </div>
      )}
      <p className="mt-5 text-xs text-muted">
        Score = {weight} % × affinité + {100 - weight} % × qualité. Affinité d&apos;un tag : ta part de temps passée dessus
        divisée par sa part dans ta bibliothèque (50 = neutre, 100 = 4× plus de temps que sa place, 0 = 4× moins), moyennée
        sur les tags du jeu présents sur au moins {MIN_TAG_GAMES} de tes jeux. Qualité : % d&apos;avis positifs ramené de
        50–100 à 0–100, après ajout de {REVIEW_PRIOR_WEIGHT} avis fictifs à {REVIEW_PRIOR} %, pour qu&apos;une poignée
        d&apos;avis ne suffise pas à faire un chef-d&apos;œuvre.
      </p>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <>
      <span>{label}</span>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[.06]">
        <motion.div className="bg-gradient-accent h-full rounded-full" animate={{ width: `${value * 100}%` }} transition={spring} />
      </div>
      <span className="text-right tabular-nums">{Math.round(value * 100)}</span>
    </>
  );
}
