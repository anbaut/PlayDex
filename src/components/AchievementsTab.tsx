"use client";
import { motion } from "motion/react";
import type { AchievementsView } from "@/lib/achievements";
import { num, pct } from "@/lib/format";
import type { Game } from "@/lib/types";
import { Bar, Cover, CountUp, Empty, Panel, SectionTitle } from "./ui";

export default function AchievementsTab({ games, view, onOpen }: { games: Game[]; view: AchievementsView; onOpen: (g: Game) => void }) {
  const byId = new Map(games.map((g) => [g.appid, g]));
  if (!view.totalUnlocked) {
    return <Empty>Aucun succès pour l&apos;instant : lance une synchronisation Steam (la démo n&apos;en a pas).</Empty>;
  }
  const rarest = view.rarest[0];

  return (
    <div className="flex flex-col gap-8">
      <SectionTitle title="Succès">
        Ta collection de trophées. La rareté vient du <b>% de joueurs Steam</b> qui ont débloqué chaque succès.
      </SectionTitle>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
        <Stat label="Succès débloqués" value={<CountUp value={view.totalUnlocked} format={(v) => num(v)} />} />
        <Stat label="Jeux à 100 %" value={String(view.perfect.length)} />
        <Stat label="Complétion moyenne" value={view.avgCompletion != null ? pct(view.avgCompletion) : "–"} sub="sur tes jeux commencés qui ont des succès" />
        {rarest && <Stat label="Ton plus rare" value={`${rarest.pct.toLocaleString("fr-FR")} %`} sub={`${rarest.name} · ${byId.get(rarest.appid)?.name ?? ""}`} />}
      </div>

      <Panel title="Tes succès les plus rares" sub="Débloqués par le moins de joueurs Steam.">
        <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
          {view.rarest.map((a, i) => {
            const g = byId.get(a.appid);
            return (
              <motion.button
                key={`${a.appid}-${a.name}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { delay: i * 0.03 } }}
                onClick={() => g && onOpen(g)}
                className="flex items-center gap-3 rounded-xl border border-line bg-white/[.02] p-3 text-left transition hover:border-amber-300/40"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.icon} alt="" className="size-12 rounded-lg shadow-lg shadow-amber-500/10" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{a.name}</div>
                  <div className="truncate text-xs text-muted">{g?.name}</div>
                  <div className="truncate text-xs text-muted">{a.desc}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-display text-lg font-bold text-amber-300">{a.pct.toLocaleString("fr-FR")} %</div>
                  <div className="text-[11px] text-muted">{new Date(a.at * 1000).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}</div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </Panel>

      {view.almost.length > 0 && (
        <Panel title="Si près du 100 %" sub="Jeux à plus de 75 % : voici ce qui manque, du plus facile (le plus courant) au plus rare.">
          <div className="mt-2 grid gap-3 lg:grid-cols-2">
            {view.almost.map((a) => {
              const g = byId.get(a.appid);
              if (!g) return null;
              return (
                <div key={a.appid} className="rounded-xl border border-line bg-white/[.02] p-3">
                  <button onClick={() => onOpen(g)} className="flex w-full items-center gap-3 text-left">
                    <Cover src={g.cover} alt={g.name} className="aspect-[460/215] w-28 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{g.name}</div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                        <Bar value={a.unlocked / a.total} className="flex-1" />
                        <span className="tabular-nums">{a.unlocked}/{a.total}</span>
                      </div>
                    </div>
                  </button>
                  <ul className="mt-3 flex flex-col gap-1.5">
                    {a.missing.slice(0, 4).map((m) => (
                      <li key={m.name} className="flex items-center gap-2 text-xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={m.icon} alt="" className="size-6 rounded" />
                        <span className="flex-1 truncate">{m.name}</span>
                        <span className="text-muted tabular-nums">{m.pct != null ? `${m.pct.toLocaleString("fr-FR")} %` : ""}</span>
                      </li>
                    ))}
                    {a.missing.length > 4 && <li className="text-xs text-muted">+ {a.missing.length - 4} autres</li>}
                  </ul>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {view.perfect.length > 0 && (
        <Panel title={`Complétés à 100 % (${view.perfect.length})`}>
          <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
            {view.perfect.map((id) => byId.get(id)).filter((g): g is Game => Boolean(g)).map((g) => (
              <button key={g.appid} onClick={() => onOpen(g)} className="group relative overflow-hidden rounded-xl">
                <Cover src={g.cover} alt={g.name} className="aspect-[460/215] transition group-hover:scale-105" />
                <span className="absolute top-1.5 right-1.5 rounded-md bg-amber-400 px-1.5 text-xs font-bold text-black">100 %</span>
              </button>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="glass relative overflow-hidden rounded-2xl px-5 py-4">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-300 to-amber-500 opacity-70" />
      <div className="text-[11px] font-semibold tracking-[.12em] text-muted uppercase">{label}</div>
      <div className="mt-2 truncate font-display text-[28px] font-bold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 truncate text-[13px] text-muted">{sub}</div>}
    </div>
  );
}
