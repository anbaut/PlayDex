"use client";
import { animate, AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";

/** Jaquette Steam, avec dégradé de secours si l'image n'existe pas. */
export function Cover({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`cover-fallback relative overflow-hidden ${className}`}>
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      )}
      {failed && (
        <div className="absolute inset-0 flex items-end p-3 font-display text-sm font-bold text-white/70">{alt}</div>
      )}
    </div>
  );
}

/** Nombre qui défile de 0 à sa valeur à l'apparition. */
export function CountUp({ value, format }: { value: number; format: (v: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const formatRef = useRef(format);
  useEffect(() => {
    formatRef.current = format;
  });
  useEffect(() => {
    const controls = animate(0, value, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = formatRef.current(v);
      },
    });
    return () => controls.stop();
  }, [value]);
  return <span ref={ref}>{format(value)}</span>;
}

const BADGE_TONES = {
  neutral: "border-line bg-white/[.04] text-muted",
  good: "border-good/35 text-good",
  warn: "border-warn/35 text-warn",
  bad: "border-bad/35 text-bad",
  accent: "border-accent-2/35 bg-accent-2/[.06] text-accent-2",
  amber: "border-amber-400/30 bg-amber-400/[.06] text-amber-300",
};

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof BADGE_TONES; children: ReactNode }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${BADGE_TONES[tone]}`}>
      {children}
    </span>
  );
}

export function ratingTone(pct: number) {
  return pct >= 85 ? "good" : pct >= 70 ? "warn" : "bad";
}

export function SectionTitle({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="font-display text-3xl font-bold tracking-tight">{title}</h2>
      {children && <p className="mt-1.5 max-w-3xl text-[15px] text-muted [&_b]:font-semibold [&_b]:text-ink">{children}</p>}
    </div>
  );
}

/** Bandeau flottant de progression de la synchro. */
export function SyncToast({ running, progress, message, error, onDismiss }: {
  running: boolean; progress: number; message?: string; error?: string; onDismiss: () => void;
}) {
  const visible = running || Boolean(error);
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.96 }}
          className="glass fixed bottom-6 left-1/2 z-50 w-[min(520px,calc(100vw-32px))] -translate-x-1/2 rounded-2xl p-4 shadow-2xl shadow-black/60"
        >
          {error ? (
            <div className="flex items-start gap-3 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
              <p className="flex-1">{error}</p>
              <button onClick={onDismiss} className="text-muted hover:text-ink" aria-label="Fermer">
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex justify-between gap-4 text-sm">
                <span className="truncate">{message}</span>
                <span className="text-muted tabular-nums">{Math.round(progress * 100)} %</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[.06]">
                <motion.div className="bg-gradient-accent h-full rounded-full" animate={{ width: `${progress * 100}%` }} />
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Ligne compacte : vignette + nom + infos, cliquable. */
export function MiniGame({ cover, name, sub, right, onClick, dim = false }: {
  cover: string; name: string; sub?: ReactNode; right?: ReactNode; onClick?: () => void; dim?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl p-1.5 text-left transition hover:bg-white/[.04]"
    >
      <Cover src={cover} alt={name} className={`aspect-[460/215] w-24 shrink-0 rounded-lg ${dim ? "opacity-50 grayscale group-hover:opacity-100 group-hover:grayscale-0" : ""}`} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{name}</div>
        {sub && <div className="truncate text-xs text-muted">{sub}</div>}
      </div>
      {right && <div className="shrink-0 text-right text-sm tabular-nums">{right}</div>}
    </button>
  );
}

/** Avatars empilés (amis). */
export function Avatars({ people, max = 5 }: { people: { steamid: string; name: string; avatar?: string }[]; max?: number }) {
  return (
    <div className="flex items-center">
      {people.slice(0, max).map((p, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={p.steamid}
          src={p.avatar}
          alt={p.name}
          title={p.name}
          className="size-7 rounded-full border-2 border-panel bg-panel-2"
          style={{ marginLeft: i ? -8 : 0 }}
        />
      ))}
      {people.length > max && <span className="ml-1.5 text-xs text-muted">+{people.length - max}</span>}
    </div>
  );
}

export function Bar({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-white/[.06] ${className}`}>
      <motion.div className="bg-gradient-accent h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${Math.round(Math.min(1, value) * 100)}%` }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} />
    </div>
  );
}

export function Panel({ title, sub, children, className = "" }: { title?: ReactNode; sub?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`glass rounded-2xl p-5 ${className}`}>
      {title && <h3 className="font-semibold">{title}</h3>}
      {sub && <p className="mt-0.5 mb-3 text-[13px] text-muted [&_b]:text-ink">{sub}</p>}
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="glass rounded-2xl p-10 text-center text-muted">{children}</div>;
}
