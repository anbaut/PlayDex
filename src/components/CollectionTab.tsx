"use client";
import { useState } from "react";
import type { SeriesView, StudioView } from "@/lib/collection";
import { eur, hrs } from "@/lib/format";
import type { Game } from "@/lib/types";
import { Bar, Cover, Empty, Panel, SectionTitle } from "./ui";

export default function CollectionTab({ games, series, studios, onOpen }: {
  games: Game[]; series: SeriesView[]; studios: StudioView[]; onOpen: (g: Game) => void;
}) {
  const [incompleteOnly, setIncompleteOnly] = useState(false);
  const byId = new Map(games.map((g) => [g.appid, g]));
  const shown = series.filter((s) => !incompleteOnly || s.missing.length).slice(0, 24);
  const missingTotal = series.reduce((s, x) => s + x.missing.length, 0);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionTitle title="Tes séries">
            Comme un classeur de cartes : pour chaque série où tu as un jeu, ce que tu possèdes et ce qui manque, avec
            le prix pour compléter. <b>{missingTotal} jeux manquants</b> au total.
          </SectionTitle>
          <label className="mb-6 flex cursor-pointer items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={incompleteOnly} onChange={(e) => setIncompleteOnly(e.target.checked)} className="accent-[#3987e5]" />
            Seulement les séries incomplètes
          </label>
        </div>
        {series.length === 0 ? (
          <Empty>Aucune série trouvée pour l&apos;instant : elles se remplissent au fil des synchronisations.</Empty>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {shown.map((s) => {
              const total = s.owned.length + s.missing.length;
              return (
                <Panel key={s.name}>
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="truncate font-display text-xl font-bold">{s.name}</h3>
                    <span className="shrink-0 text-sm text-muted tabular-nums">{hrs(s.hours)} joués</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                    <Bar value={s.owned.length / total} className="flex-1" />
                    <span className="tabular-nums">{s.owned.length}/{total}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {s.owned.map((g) => (
                      <button key={g.appid} onClick={() => onOpen(g)} title={g.name} className="overflow-hidden rounded-lg ring-1 ring-accent/30 transition hover:ring-accent">
                        <Cover src={g.cover} alt={g.name} className="aspect-[460/215]" />
                      </button>
                    ))}
                    {s.missing.map((g) => (
                      <button key={g.appid} onClick={() => onOpen(g)} title={g.name} className="group relative overflow-hidden rounded-lg border border-dashed border-white/15">
                        <Cover src={g.cover} alt={g.name} className="aspect-[460/215] opacity-35 grayscale transition group-hover:opacity-100 group-hover:grayscale-0" />
                        <span className="absolute right-1 bottom-1 rounded bg-black/70 px-1 text-[10px] font-semibold">
                          {g.isFree ? "Gratuit" : g.price != null ? eur(g.price, 2) : "–"}
                          {g.discountPct > 0 && <span className="ml-1 text-emerald-400">-{g.discountPct}%</span>}
                        </span>
                      </button>
                    ))}
                  </div>
                  {s.missing.length > 0 && (
                    <p className="mt-3 text-xs text-muted">
                      Compléter la série : <b className="text-ink">{eur(s.costToComplete, 2)}</b> au prix actuel
                    </p>
                  )}
                </Panel>
              );
            })}
          </div>
        )}
        <p className="mt-3 text-xs text-muted">
          Les jeux manquants sont retrouvés par une recherche Store sur le nom de la série : il peut en manquer.
        </p>
      </div>

      <div>
        <SectionTitle title="Tes studios">Les développeurs sur lesquels tu as passé le plus de temps.</SectionTitle>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {studios.map((s, i) => (
            <Panel key={s.name} className="!p-4">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate font-semibold">
                  <span className="mr-2 text-muted">{i + 1}.</span>{s.name}
                </span>
                <span className="shrink-0 font-display font-bold tabular-nums">{hrs(s.hours)}</span>
              </div>
              <div className="mt-1 text-xs text-muted">{s.count} jeu{s.count > 1 ? "x" : ""} possédé{s.count > 1 ? "s" : ""}, {s.played} lancé{s.played > 1 ? "s" : ""}</div>
              <div className="mt-3 grid grid-cols-4 gap-1.5">
                {s.top.map((id) => byId.get(id)).filter((g): g is Game => Boolean(g)).map((g) => (
                  <button key={g.appid} onClick={() => onOpen(g)} title={g.name} className="overflow-hidden rounded-md">
                    <Cover src={g.cover} alt={g.name} className="aspect-[460/215] transition hover:scale-105" />
                  </button>
                ))}
              </div>
            </Panel>
          ))}
        </div>
      </div>
    </div>
  );
}
