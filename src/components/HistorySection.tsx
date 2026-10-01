"use client";
import type { ReactNode } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AchievementsView } from "@/lib/achievements";
import type { HistoryView } from "@/lib/history";
import { hrs, num } from "@/lib/format";
import type { Game } from "@/lib/types";
import { MiniGame, Panel } from "./ui";

const BLUE = "#3987e5";
const AXIS = { stroke: "#8b93a7", fontSize: 12, tickLine: false, axisLine: false } as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Tip({ active, payload, render }: { active?: boolean; payload?: any[]; render: (d: any) => ReactNode }) {
  if (!active || !payload?.length) return null;
  return <div className="rounded-lg border border-white/10 bg-panel-2 px-3 py-2 text-[13px] shadow-xl shadow-black/50">{render(payload[0].payload)}</div>;
}

const weekLabel = (t: number) => new Date(t * 1000).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
const monthLabel = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1).toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
};

export default function HistorySection({ games, history, achievements, onOpen }: {
  games: Game[]; history: HistoryView; achievements: AchievementsView; onOpen: (g: Game) => void;
}) {
  const byId = new Map(games.map((g) => [g.appid, g]));
  const weeks = history.weeks.map((w) => ({ ...w, label: weekLabel(w.week) }));
  const months = achievements.byMonth.map((m) => ({ ...m, label: monthLabel(m.month) }));
  const avgWeek = weeks.length ? weeks.reduce((s, w) => s + w.hours, 0) / weeks.length : 0;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel
        className="lg:col-span-2"
        title="Ton activité, semaine par semaine"
        sub={
          history.since ? (
            <>
              Construit à partir des photos prises à chaque synchro ({history.snapshots} pour l&apos;instant, la première
              reconstituée via les 2 dernières semaines de Steam). Moyenne : <b>{hrs(avgWeek)} / semaine</b>. Entre deux
              synchros, les heures sont réparties uniformément sur les jours.
            </>
          ) : "Se remplit à chaque synchronisation Steam (automatique à l'ouverture si la dernière a plus de 6 h)."
        }
      >
        {weeks.length > 0 && (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={weeks} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
              <XAxis dataKey="label" {...AXIS} />
              <YAxis {...AXIS} tickFormatter={(v) => `${v} h`} />
              <Tooltip cursor={{ fill: "rgba(255,255,255,.04)" }} content={<Tip render={(d) => <>Semaine du {d.label} : <b>{hrs(d.hours)}</b></>} />} />
              <Bar dataKey="hours" fill={BLUE} radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>

      <Panel title="Tes jeux des 30 derniers jours" sub="D'après les photos de synchro.">
        {history.recent.length ? (
          history.recent.map((r) => {
            const g = byId.get(r.appid);
            return g ? <MiniGame key={r.appid} cover={g.cover} name={g.name} right={<b>{hrs(r.hours)}</b>} onClick={() => onOpen(g)} /> : null;
          })
        ) : (
          <p className="text-sm text-muted">Rien de noté pour l&apos;instant.</p>
        )}
      </Panel>

      <Panel title="Les revenants" sub="Jeux relancés après plus d'un an sans y toucher.">
        {history.comebacks.length ? (
          history.comebacks.map((c) => {
            const g = byId.get(c.appid);
            return g ? (
              <MiniGame key={`${c.appid}-${c.at}`} cover={g.cover} name={g.name}
                sub={`relancé le ${new Date(c.at * 1000).toLocaleDateString("fr-FR")}`}
                right={<b>{Math.round(c.gapDays / 30)} mois d&apos;absence</b>} onClick={() => onOpen(g)} />
            ) : null;
          })
        ) : (
          <p className="text-sm text-muted">Aucun pour l&apos;instant : ils apparaîtront quand tu relanceras un vieux jeu.</p>
        )}
      </Panel>

      {months.length > 0 && (
        <Panel
          className="lg:col-span-2"
          title="Ton passé, reconstitué par tes succès"
          sub={<>Steam date chaque succès débloqué : <b>{num(achievements.totalUnlocked)} succès</b> dessinent tes périodes de jeu depuis {months[0].label}.</>}
        >
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={months} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="achGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BLUE} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={BLUE} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
              <XAxis dataKey="label" {...AXIS} minTickGap={40} />
              <YAxis {...AXIS} allowDecimals={false} />
              <Tooltip cursor={{ stroke: "rgba(255,255,255,.2)" }} content={<Tip render={(d) => <>{d.label} : <b>{d.count} succès</b></>} />} />
              <Area type="monotone" dataKey="count" stroke={BLUE} strokeWidth={2} fill="url(#achGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
      )}
    </div>
  );
}
