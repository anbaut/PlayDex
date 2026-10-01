"use client";
import { motion } from "motion/react";
import type { overview } from "@/lib/analytics";
import { eur, hrs, num } from "@/lib/format";
import type { Game, Library } from "@/lib/types";
import { LogoMark } from "./Logo";
import { CountUp } from "./ui";

type Overview = ReturnType<typeof overview>;

const fade = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.08 * i, duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
});

export default function Hero({ library, stats, onOpen }: { library: Library; stats: Overview; onOpen: (g: Game) => void }) {
  const backdrop = [...library.games].sort((a, b) => b.hours - a.hours).slice(0, 6);
  const { profile } = library;

  const kpis = [
    { label: "Valeur de la collection", value: <CountUp value={stats.value} format={(v) => eur(v)} />, sub: "au prix plein actuel" },
    {
      label: "Jamais lancés",
      value: <>{stats.never.length} <span className="text-lg text-muted">/ {stats.count}</span></>,
      sub: `${eur(stats.neverValue)} qui dorment`,
    },
    { label: "Coût par heure", value: <CountUp value={stats.costPerHour} format={(v) => eur(v, 2)} />, sub: "valeur ÷ heures jouées" },
    {
      label: "Jeu le plus joué",
      value: <button onClick={() => onOpen(stats.top)} className="max-w-full truncate text-left hover:text-accent-2">{stats.top.name}</button>,
      sub: `${hrs(stats.top.hours)} · ${Math.round((100 * stats.top.hours) / stats.totalHours)} % de ton temps`,
    },
    {
      label: "Ces 2 dernières semaines",
      value: hrs(stats.recentHours),
      sub: stats.recent.length ? `sur ${stats.recent[0].name}${stats.recent.length > 1 ? ` et ${stats.recent.length - 1} autre(s)` : ""}` : "calme plat",
    },
  ];

  return (
    <section className="relative">
      {/* Jaquettes des jeux les plus joués, floutées en fond */}
      <div aria-hidden className="pointer-events-none absolute -inset-x-6 -top-24 h-[360px] overflow-hidden opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)]">
        <div className="flex h-full scale-110 blur-2xl saturate-150">
          {backdrop.map((g) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={g.appid} src={g.hero ?? g.cover} alt="" className="h-full min-w-0 flex-1 object-cover" />
          ))}
        </div>
      </div>

      <div className="relative flex flex-col gap-6 pt-4 pb-8 sm:flex-row sm:items-center">
        <motion.div {...fade(0)} className="shrink-0">
          {profile.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar} alt="" className="size-24 rounded-3xl border-2 border-white/15 shadow-2xl shadow-accent/30" />
          ) : (
            <LogoMark className="size-24 drop-shadow-2xl" />
          )}
        </motion.div>
        <div className="min-w-0">
          <motion.div {...fade(1)} className="text-xs font-semibold tracking-[.2em] text-muted uppercase">
            Playdex de {profile.persona}
            {library.source === "demo" && <span className="ml-2 rounded bg-amber-400/15 px-1.5 py-0.5 text-amber-300">démo</span>}
          </motion.div>
          <motion.h1 {...fade(2)} className="mt-3 font-display text-4xl leading-[1.04] font-bold tracking-tight sm:text-5xl 2xl:text-6xl">
            {stats.count} jeux,{" "}
            <span className="text-gradient">
              <CountUp value={stats.totalHours} format={(v) => num(v)} /> heures
            </span>{" "}
            de ta vie.
          </motion.h1>
          <motion.p {...fade(3)} className="mt-3 text-[17px] text-muted">
            Soit <b className="text-ink">{num(stats.totalHours / 24)} jours</b> non-stop. Et{" "}
            <b className="text-ink">{stats.never.length} jeux</b> jamais lancés qui te regardent.
          </motion.p>
        </div>
        <motion.div {...fade(3)} className="sm:ml-auto">
          <DexRing seen={stats.count} caught={stats.count - stats.never.length} />
        </motion.div>
      </div>

      <div className="relative grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            {...fade(4 + i)}
            className="glass relative overflow-hidden rounded-2xl px-5 py-4"
          >
            <div className="bg-gradient-accent absolute inset-x-0 top-0 h-0.5 opacity-70" />
            <div className="text-[11px] font-semibold tracking-[.12em] text-muted uppercase">{k.label}</div>
            <div className="mt-2 truncate font-display text-[28px] font-bold tabular-nums">{k.value}</div>
            <div className="mt-0.5 truncate text-[13px] text-muted">{k.sub}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/** Comme un Pokédex : « vus » = possédés, « capturés » = lancés au moins une fois. */
function DexRing({ seen, caught }: { seen: number; caught: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const ratio = seen ? caught / seen : 0;
  return (
    <div className="glass flex items-center gap-5 rounded-3xl py-4 pr-6 pl-4">
      <svg viewBox="0 0 128 128" className="size-28 -rotate-90">
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3987e5" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="11" />
        <motion.circle
          cx="64" cy="64" r={r} fill="none" stroke="url(#ring-grad)" strokeWidth="11" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - ratio) }}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
        />
        <text x="64" y="64" transform="rotate(90 64 64)" textAnchor="middle" dominantBaseline="central"
          className="fill-ink font-display text-[26px] font-bold">
          {Math.round(ratio * 100)}%
        </text>
      </svg>
      <div className="text-sm">
        <div className="text-[11px] font-semibold tracking-[.14em] text-muted uppercase">Playdex</div>
        <div className="mt-2 flex items-baseline gap-2"><b className="font-display text-2xl tabular-nums">{caught}</b><span className="text-muted">capturés</span></div>
        <div className="flex items-baseline gap-2"><b className="font-display text-2xl tabular-nums">{seen}</b><span className="text-muted">vus</span></div>
        <div className="mt-1 text-[11px] text-muted">capturé = lancé au moins une fois</div>
      </div>
    </div>
  );
}
