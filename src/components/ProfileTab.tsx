"use client";
import { Download } from "lucide-react";
import { motion } from "motion/react";
import type { AchievementsView } from "@/lib/achievements";
import { hrs } from "@/lib/format";
import type { ProfileView } from "@/lib/profile";
import type { Game, Library } from "@/lib/types";
import { Bar, Cover, Panel, SectionTitle } from "./ui";

export default function ProfileTab({ library, profile, achievements, onOpen }: {
  library: Library; profile: ProfileView; achievements: AchievementsView; onOpen: (g: Game) => void;
}) {
  const byId = new Map(library.games.map((g) => [g.appid, g]));
  const maxLift = Math.log2(profile.topTags[0]?.lift ?? 2);

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle title="Ton profil de joueur">
        Chaque trait vient d&apos;une règle simple, affichée en dessous : pas de boîte noire.
      </SectionTitle>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Panel title="Ta carte" sub="Générée à partir de tes données, prête à partager.">
          {library.source === "demo" ? (
            <p className="text-sm text-muted">Disponible avec ton compte Steam.</p>
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/card?t=${library.syncedAt}`} alt="Carte de profil" className="w-full rounded-xl border border-line shadow-2xl shadow-black/50" />
              <a
                href={`/api/card?t=${library.syncedAt}`}
                download="playdex.png"
                className="bg-gradient-accent mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-accent/25 hover:brightness-110"
              >
                <Download className="size-4" /> Télécharger l&apos;image
              </a>
            </>
          )}
        </Panel>

        <Panel title="Tes traits">
          <div className="mt-2 flex flex-col gap-3">
            {profile.traits.map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0, transition: { delay: i * 0.06 } }}
                className="rounded-xl border border-line bg-white/[.02] p-3">
                <div className="font-semibold"><span className="mr-2 text-xl">{t.emoji}</span>{t.label}</div>
                <div className="mt-0.5 text-xs text-muted">{t.rule}</div>
              </motion.div>
            ))}
            {!profile.traits.length && <p className="text-sm text-muted">Aucun trait marqué : un joueur tout en nuances.</p>}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Ce qui aspire ton temps" sub="Tags où ta part de temps dépasse le plus leur place dans ta bibliothèque.">
          <div className="mt-2 flex flex-col gap-3">
            {profile.topTags.map((t) => (
              <div key={t.tag}>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">{t.tag}</span>
                  <span className="text-muted tabular-nums">× {t.lift.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}</span>
                </div>
                <Bar value={Math.log2(t.lift) / maxLift} className="mt-1.5" />
                <div className="mt-1 text-xs text-muted">
                  {Math.round(t.gameShare * 100)} % de tes jeux, {Math.round(t.timeShare * 100)} % de ton temps
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Tes habitudes">
          <dl className="mt-2 grid grid-cols-2 gap-3">
            <Fact label="Temps médian par jeu lancé" value={hrs(profile.medianPlayed)} />
            <Fact label="Tu lâches un jeu après" value={profile.abandonMedian != null ? hrs(profile.abandonMedian) : "–"}
              sub={`médiane de ${profile.abandonedCount} jeux pas relancés depuis 6 mois, moins de 50 % des succès`} />
            <Fact label="Succès débloqués" value={achievements.totalUnlocked.toLocaleString("fr-FR")} />
            <Fact label="Jeux à 100 %" value={String(achievements.perfect.length)} />
          </dl>
          <div className="mt-5 text-sm font-semibold">Ton podium</div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {profile.top3.map((id) => byId.get(id)).filter((g): g is Game => Boolean(g)).map((g, i) => (
              <button key={g.appid} onClick={() => onOpen(g)} className="group relative overflow-hidden rounded-lg">
                <Cover src={g.cover} alt={g.name} className="aspect-[460/215] transition group-hover:scale-105" />
                <span className="absolute top-1 left-1 rounded bg-black/70 px-1.5 text-xs font-bold">{["🥇", "🥈", "🥉"][i]} {hrs(g.hours)}</span>
              </button>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Fact({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white/[.02] px-3 py-2.5">
      <dt className="text-[11px] font-semibold tracking-wider text-muted uppercase">{label}</dt>
      <dd className="mt-1 font-display text-xl font-bold tabular-nums">{value}</dd>
      {sub && <dd className="text-[11px] text-muted">{sub}</dd>}
    </div>
  );
}
