"use client";
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "motion/react";
import type { MouseEvent } from "react";
import { ago, dexNo, eur, hrs } from "@/lib/format";
import type { Game } from "@/lib/types";
import { Badge, Cover, ratingTone } from "./ui";

type Props = { game: Game; maxLog: number; ghost?: boolean; onOpen: (g: Game) => void };

/** Carte de jeu : légère inclinaison 3D et reflet qui suivent la souris. */
export default function GameCard({ game, maxLog, ghost = false, onOpen }: Props) {
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const spring = { stiffness: 220, damping: 22 };
  const rotateX = useSpring(useTransform(my, [0, 1], [7, -7]), spring);
  const rotateY = useSpring(useTransform(mx, [0, 1], [-9, 9]), spring);
  const glareX = useTransform(mx, (v) => `${v * 100}%`);
  const glareY = useTransform(my, (v) => `${v * 100}%`);
  const glare = useMotionTemplate`radial-gradient(420px circle at ${glareX} ${glareY}, rgba(255,255,255,.14), transparent 45%)`;

  const onMove = (e: MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => {
    mx.set(0.5);
    my.set(0.5);
  };

  // Arrondi : un flottant brut s'écrit différemment côté serveur et client (erreur d'hydratation)
  const bar = game.hours > 0 ? Math.round(Math.max(3, (100 * Math.log1p(game.hours)) / maxLog)) : 0;

  return (
    <motion.button
      type="button"
      onClick={() => onOpen(game)}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      whileHover={{ y: -4 }}
      className="group relative w-full cursor-pointer overflow-hidden rounded-2xl border border-line bg-panel text-left shadow-lg shadow-black/20 transition-[border-color,box-shadow] duration-200 hover:border-accent/50 hover:shadow-2xl hover:shadow-accent/10"
    >
      <div className="relative">
        <Cover
          src={game.cover}
          alt={game.name}
          className={`aspect-[460/215] transition-[filter] duration-300 ${ghost ? "brightness-50 grayscale group-hover:brightness-100 group-hover:grayscale-0" : ""}`}
        />
        {game.dexNo > 0 && (
          <span className="absolute top-2 left-2 rounded-md bg-black/60 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white/85 backdrop-blur-sm">
            {dexNo(game.dexNo)}
          </span>
        )}
        {game.discountPct > 0 && (
          <span className="absolute top-2 right-2 rounded-md bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white shadow-lg">
            -{game.discountPct}%
          </span>
        )}
      </div>

      <div className="p-3.5">
        <div className="truncate text-[14.5px] font-semibold" title={game.name}>{game.name}</div>
        <div className="mt-1.5 flex justify-between gap-2 text-[12.5px] text-muted">
          <b className="font-semibold text-ink tabular-nums">{hrs(game.hours)}</b>
          <span>{ago(game.lastPlayed)}</span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[.06]">
          <div className="bg-gradient-accent h-full rounded-full" style={{ width: `${bar}%` }} />
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {game.status === "never" && <Badge tone="amber">Jamais lancé</Badge>}
          {game.hours2w > 0 && <Badge tone="accent">▲ {hrs(game.hours2w)} ces 2 sem.</Badge>}
          {game.reviewPct != null && <Badge tone={ratingTone(game.reviewPct)}>👍 {game.reviewPct} %</Badge>}
          {game.ach && game.ach.unlocked > 0 && (
            <Badge tone={game.ach.unlocked === game.ach.total ? "amber" : "neutral"}>🏆 {game.ach.unlocked}/{game.ach.total}</Badge>
          )}
          {game.isFree ? <Badge>Gratuit</Badge> : game.price != null && <Badge>{eur(game.price, 2)}</Badge>}
        </div>
      </div>

      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: glare }}
      />
    </motion.button>
  );
}
