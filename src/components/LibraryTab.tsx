"use client";
import { motion } from "motion/react";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { hrs } from "@/lib/format";
import type { Game, Status } from "@/lib/types";
import GameGrid from "./GameGrid";

const STATUSES: { id: Status | "all"; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "played", label: "Joués" },
  { id: "tasted", label: "Goûtés (< 2 h)" },
  { id: "never", label: "Jamais lancés" },
];

const SORTS: Record<string, (a: Game, b: Game) => number> = {
  "Temps de jeu": (a, b) => b.hours - a.hours,
  "Dernière partie": (a, b) => b.lastPlayed - a.lastPlayed,
  "Nom": (a, b) => a.name.localeCompare(b.name, "fr"),
  "Prix": (a, b) => (b.fullPrice ?? -1) - (a.fullPrice ?? -1),
  "Évaluations": (a, b) => (b.reviewPct ?? -1) - (a.reviewPct ?? -1),
  "Promo": (a, b) => b.discountPct - a.discountPct,
  "N° de Dex": (a, b) => a.dexNo - b.dexNo,
};

export default function LibraryTab({ games, onOpen }: { games: Game[]; onOpen: (g: Game) => void }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status | "all">("all");
  const [genres, setGenres] = useState<string[]>([]);
  const [sort, setSort] = useState("Temps de jeu");

  const allGenres = useMemo(() => {
    const count = new Map<string, number>();
    for (const g of games) for (const genre of g.tags) count.set(genre, (count.get(genre) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 24).map(([genre]) => genre);
  }, [games]);

  const view = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^(n°|#)\s*/, "");
    // Un nombre seul cherche aussi le numéro de Dex : « 42 » trouve le N° 042
    const no = /^\d+$/.test(q) ? Number(q) : null;
    return games
      .filter((g) => !q || g.name.toLowerCase().includes(q) || g.dexNo === no)
      .filter((g) => status === "all" || g.status === status)
      .filter((g) => !genres.length || genres.some((genre) => g.tags.includes(genre)))
      .sort(SORTS[sort]);
  }, [games, query, status, genres, sort]);

  const toggleGenre = (genre: string) =>
    setGenres((gs) => (gs.includes(genre) ? gs.filter((x) => x !== genre) : [...gs, genre]));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="glass flex min-w-60 flex-1 items-center gap-2 rounded-full px-4 py-2.5 focus-within:border-accent/60">
          <Search className="size-4 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un jeu ou un N°…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </label>

        <div className="glass flex rounded-full p-1">
          {STATUSES.map((s) => (
            <button
              key={s.id}
              onClick={() => setStatus(s.id)}
              className={`relative rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${status === s.id ? "text-white" : "text-muted hover:text-ink"}`}
            >
              {status === s.id && (
                <motion.span layoutId="status-pill" className="bg-gradient-accent absolute inset-0 rounded-full" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
              )}
              <span className="relative">{s.label}</span>
            </button>
          ))}
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="glass cursor-pointer rounded-full px-4 py-2.5 text-sm font-semibold outline-none"
          aria-label="Trier par"
        >
          {Object.keys(SORTS).map((s) => <option key={s} className="bg-panel">{s}</option>)}
        </select>
      </div>

      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
        {allGenres.map((genre) => {
          const on = genres.includes(genre);
          return (
            <button
              key={genre}
              onClick={() => toggleGenre(genre)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition ${on ? "border-accent bg-accent/15 text-ink" : "border-line text-muted hover:border-white/20 hover:text-ink"}`}
            >
              {genre}
            </button>
          );
        })}
      </div>

      <p className="mt-4 mb-4 text-sm text-muted">
        {view.length} jeux · {hrs(view.reduce((s, g) => s + g.hours, 0))}
      </p>
      <GameGrid games={view} onOpen={onOpen} />
    </div>
  );
}
