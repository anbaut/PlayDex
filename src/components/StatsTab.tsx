"use client";
import type { ReactNode } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, ReferenceDot, ReferenceLine,
  ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from "recharts";
import { costPerHour, tagHours, lastPlayedByYear, pareto, playtimeBuckets } from "@/lib/analytics";
import { eur, hrs, num } from "@/lib/format";
import type { AchievementsView } from "@/lib/achievements";
import type { HistoryView } from "@/lib/history";
import type { Game } from "@/lib/types";
import HistorySection from "./HistorySection";

const BLUE = "#3987e5";
const AQUA = "#22d3ee";
const AXIS = { stroke: "#8b93a7", fontSize: 12, tickLine: false, axisLine: false } as const;
const GRID = <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />;

function Panel({ title, sub, children, className = "" }: { title: string; sub?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`glass rounded-2xl p-5 ${className}`}>
      <h3 className="font-semibold">{title}</h3>
      {sub && <p className="mt-0.5 mb-3 text-[13px] text-muted">{sub}</p>}
      {children}
    </section>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Tip({ active, payload, render }: { active?: boolean; payload?: any[]; render: (d: any) => ReactNode }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-panel-2 px-3 py-2 text-[13px] shadow-xl shadow-black/50">
      {render(payload[0].payload)}
    </div>
  );
}

export default function StatsTab({ games, history, achievements, onOpen }: {
  games: Game[]; history: HistoryView; achievements: AchievementsView; onOpen: (g: Game) => void;
}) {
  return (
    <div className="flex flex-col gap-10">
      <HistorySection games={games} history={history} achievements={achievements} onOpen={onOpen} />
      <LibraryStats games={games} onOpen={onOpen} />
    </div>
  );
}

function LibraryStats({ games, onOpen }: { games: Game[]; onOpen: (g: Game) => void }) {
  const { points, n80, played } = pareto(games);
  const tags = tagHours(games).slice(0, 10);
  const buckets = playtimeBuckets(games);
  const years = lastPlayedByYear(games);
  const cph = costPerHour(games);
  const xmax = Math.max(1, ...cph.map((g) => g.fullPrice ?? 0)) * 1.05;
  const n80Share = points[n80 - 1]?.share ?? 0;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Où passe ton temps" sub={<>Part cumulée des heures : <b className="text-ink">{n80} jeux</b> sur {played} joués font 80 % du total.</>}>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={points} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="pareto" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BLUE} stopOpacity={0.35} />
                <stop offset="100%" stopColor={BLUE} stopOpacity={0} />
              </linearGradient>
            </defs>
            {GRID}
            <XAxis dataKey="n" {...AXIS} minTickGap={24} />
            <YAxis {...AXIS} domain={[0, 100]} tickFormatter={(v) => `${v} %`} />
            <Tooltip cursor={{ stroke: "rgba(255,255,255,.2)" }} content={<Tip render={(d) => <>{d.n} jeux → <b>{Math.round(d.share)} %</b> du temps</>} />} />
            <Area type="monotone" dataKey="share" stroke={BLUE} strokeWidth={2} fill="url(#pareto)" activeDot={{ r: 5, fill: AQUA, stroke: "#07090f", strokeWidth: 2 }} />
            <ReferenceDot x={n80} y={n80Share} r={6} fill={AQUA} stroke="#07090f" strokeWidth={2}
              label={{ value: `${n80} jeux = 80 %`, position: "right", fill: "#e8eaf0", fontSize: 13, offset: 10 }} />
          </AreaChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Tes tags" sub="Heures passées sur les jeux de chaque tag Steam (un jeu compte dans chacun de ses tags).">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={tags} layout="vertical" margin={{ top: 0, right: 64, left: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="tag" {...AXIS} width={170} />
            <Tooltip cursor={{ fill: "rgba(255,255,255,.04)" }} content={<Tip render={(d) => <>{d.tag} : <b>{hrs(d.hours)}</b>, {Math.round(d.share * 100)} % de ton temps</>} />} />
            <Bar dataKey="hours" fill={BLUE} radius={[0, 4, 4, 0]} barSize={16}>
              <LabelList dataKey="hours" position="right" fill="#8b93a7" fontSize={12} formatter={(v) => hrs(Number(v))} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Combien de temps tu donnes à un jeu" sub="Nombre de jeux par tranche de temps de jeu.">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={buckets} margin={{ top: 22, right: 8, left: 8, bottom: 0 }}>
            <XAxis dataKey="label" {...AXIS} />
            <Tooltip cursor={{ fill: "rgba(255,255,255,.04)" }} content={<Tip render={(d) => <>{d.label} : <b>{d.count} jeux</b></>} />} />
            <Bar dataKey="count" fill={BLUE} radius={[4, 4, 0, 0]} maxBarSize={56}>
              <LabelList dataKey="count" position="top" fill="#e8eaf0" fontSize={13} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Dernière partie, par année" sub="Nombre de jeux dont la dernière session date de chaque année.">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={years} margin={{ top: 22, right: 8, left: -20, bottom: 0 }}>
            {GRID}
            <XAxis dataKey="year" {...AXIS} />
            <YAxis {...AXIS} allowDecimals={false} />
            <Tooltip cursor={{ fill: "rgba(255,255,255,.04)" }} content={<Tip render={(d) => <>{d.year} : <b>{d.count} jeux</b></>} />} />
            <Bar dataKey="count" fill={BLUE} radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      {cph.length > 0 && (
        <>
          <Panel
            className="lg:col-span-2"
            title="Rentabilité de tes achats"
            sub="Chaque point est un jeu payant joué au moins 1 h. Plus il est haut, moins l'heure t'a coûté. Clique un point pour ouvrir le jeu."
          >
            <ResponsiveContainer width="100%" height={360}>
              <ScatterChart margin={{ top: 10, right: 24, left: 0, bottom: 10 }}>
                <CartesianGrid stroke="rgba(255,255,255,.06)" />
                <XAxis type="number" dataKey="fullPrice" {...AXIS} domain={[0, Math.ceil(xmax)]} tickFormatter={(v) => `${v} €`} />
                <YAxis type="number" dataKey="hours" {...AXIS} scale="log" domain={[1, "auto"]} tickFormatter={(v) => `${num(v)} h`} />
                {/* Diagonales : même coût par heure tout le long */}
                <ReferenceLine ifOverflow="hidden" segment={[{ x: 1, y: 1 }, { x: xmax, y: xmax }]} stroke="rgba(255,255,255,.25)" strokeDasharray="4 4" />
                <ReferenceLine ifOverflow="hidden" segment={[{ x: 0.1, y: 1 }, { x: xmax, y: xmax * 10 }]} stroke="rgba(34,211,238,.35)" strokeDasharray="4 4" />
                <ZAxis range={[110, 110]} />
                <Tooltip cursor={false} content={<Tip render={(d) => (
                  <><b>{d.name}</b><br />{eur(d.fullPrice, 2)} · {hrs(d.hours)} · <b>{eur(d.eurPerHour, 2)}/h</b></>
                )} />} />
                <Scatter data={cph} fill={BLUE} stroke="#07090f" strokeWidth={2} className="cursor-pointer"
                  onClick={(d) => onOpen(d.payload as Game)} />
              </ScatterChart>
            </ResponsiveContainer>
            <p className="mt-2 text-xs text-muted">
              Pointillés : <span className="text-ink">1 €/h</span> (gris) et <span className="text-accent-2">0,10 €/h</span> (cyan). Au-dessus d&apos;une ligne, l&apos;heure t&apos;a coûté moins que ça.
            </p>
            <p className="mt-1 text-xs text-muted">Steam ne donne pas le prix que tu as payé : le prix plein actuel sert d&apos;approximation.</p>
          </Panel>

          <RankList title="Meilleurs rapports heures / €" games={cph.slice(0, 8)} onOpen={onOpen} />
          <RankList title="Les heures les plus chères" games={cph.slice(-8).reverse()} onOpen={onOpen} />
        </>
      )}
    </div>
  );
}

function RankList({ title, games, onOpen }: { title: string; games: (Game & { eurPerHour: number })[]; onOpen: (g: Game) => void }) {
  return (
    <Panel title={title}>
      <ul className="mt-2">
        {games.map((g) => (
          <li key={g.appid} className="border-b border-line last:border-0">
            <button onClick={() => onOpen(g)} className="flex w-full justify-between gap-3 py-2.5 text-left text-sm hover:text-accent-2">
              <span className="truncate">{g.name}</span>
              <span className="shrink-0 text-muted tabular-nums">{eur(g.eurPerHour, 2)}/h · {hrs(g.hours)}</span>
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
