"use client";
import { motion } from "motion/react";
import { FlaskConical, KeyRound, FileCog, Eye, RefreshCw } from "lucide-react";
import Logo from "./Logo";
import { SyncToast } from "./ui";
import { useSync } from "./useSync";

// Quelques jaquettes pour le mur animé en fond
const WALL = [
  1245620, 292030, 1086940, 413150, 367520, 1145360, 105600, 620, 646570, 504230, 294100, 427520,
  2379780, 632470, 753640, 391540, 268910, 289070, 1593500, 1174180, 814380, 1091500, 892970, 1794680,
];
const cover = (id: number) => `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${id}/header.jpg`;

const STEPS = [
  { icon: KeyRound, title: "Clé API", text: <>Récupère une clé gratuite sur <code>steamcommunity.com/dev/apikey</code>.</> },
  { icon: FileCog, title: "Fichier .env.local", text: <>Copie <code>.env.example</code> en <code>.env.local</code> et remplis <code>STEAM_API_KEY</code> et <code>STEAM_ID</code>.</> },
  { icon: Eye, title: "Profil public", text: <>Dans Steam, passe « Détails des jeux » en <b>Public</b> (confidentialité du profil).</> },
];

export default function Onboarding({ configured }: { configured: boolean }) {
  const sync = useSync();
  const rows = [WALL.slice(0, 8), WALL.slice(8, 16), WALL.slice(16)];

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 flex -rotate-6 flex-col justify-center gap-5 opacity-25 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]">
        {rows.map((row, r) => (
          <div key={r} className="marquee flex w-max gap-5" style={{ ["--speed" as string]: `${70 + r * 25}s`, animationDirection: r % 2 ? "reverse" : "normal" }}>
            {[...row, ...row].map((id, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={cover(id)} alt="" className="h-40 w-auto rounded-2xl" />
            ))}
          </div>
        ))}
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <Logo size="text-2xl" />
          <h1 className="mt-4 font-display text-5xl leading-[1.02] font-bold tracking-tight sm:text-7xl">
            Attrape-les tous.<br /><span className="text-gradient">Puis lance-les.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted">
            Ta bibliothèque Steam en Pokédex : chaque jeu numéroté, chaque heure comptée, chaque succès traqué.
            Et un coup de pouce pour enfin lancer ceux qui dorment.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.6 }}
              className="glass rounded-2xl p-5 text-sm text-muted [&_b]:text-ink [&_code]:text-accent-2"
            >
              <Icon className="mb-3 size-5 text-accent-2" />
              <div className="mb-1 font-display text-lg font-bold text-ink">{i + 1} · {title}</div>
              {text}
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-8 flex flex-wrap items-center gap-3">
          <button
            onClick={() => sync.sync()}
            disabled={!configured || sync.busy}
            className="bg-gradient-accent inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold text-white shadow-xl shadow-accent/30 transition hover:brightness-110 disabled:opacity-40 disabled:shadow-none"
          >
            <RefreshCw className="size-4" /> Synchroniser mon Steam
          </button>
          <button
            onClick={sync.demo}
            disabled={sync.busy}
            className="glass inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold transition hover:border-accent/50"
          >
            <FlaskConical className="size-4" /> Voir la démo
          </button>
          {!configured && <span className="text-sm text-muted">La synchro s&apos;active une fois <code>.env.local</code> rempli (redémarre le serveur ensuite).</span>}
        </motion.div>
      </div>
      <SyncToast {...sync} onDismiss={sync.dismiss} />
    </main>
  );
}
