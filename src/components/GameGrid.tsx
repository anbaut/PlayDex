"use client";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { Game } from "@/lib/types";
import GameCard from "./GameCard";

const PAGE = 60;

/** Grille animée : les cartes glissent à leur nouvelle place quand les filtres changent. */
export default function GameGrid({ games, ghost = false, onOpen }: { games: Game[]; ghost?: boolean; onOpen: (g: Game) => void }) {
  const [shown, setShown] = useState(PAGE);
  const maxLog = Math.log1p(Math.max(1, ...games.map((g) => g.hours)));
  const visible = games.slice(0, shown);

  return (
    <>
      <motion.div layout className="grid grid-cols-[repeat(auto-fill,minmax(232px,1fr))] gap-4">
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((g, i) => (
            <motion.div
              key={g.appid}
              layout
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0, transition: { delay: Math.min(i, 20) * 0.015 } }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
            >
              <GameCard game={g} maxLog={maxLog} ghost={ghost} onOpen={onOpen} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
      {games.length > shown && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setShown((s) => s + PAGE)}
            className="rounded-full border border-line bg-panel px-5 py-2 text-sm font-semibold text-muted transition hover:border-accent/50 hover:text-ink"
          >
            Afficher plus ({games.length - shown} restants)
          </button>
        </div>
      )}
    </>
  );
}
