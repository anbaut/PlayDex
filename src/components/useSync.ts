"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { SyncEvent } from "@/lib/types";

type SyncState = { running: boolean; progress: number; message?: string; error?: string };

/** Pilote /api/sync (flux NDJSON) et /api/demo, puis recharge les données de la page. */
export function useSync() {
  const router = useRouter();
  const [state, setState] = useState<SyncState>({ running: false, progress: 0 });
  const [refreshing, startTransition] = useTransition();

  const done = () => {
    setState({ running: false, progress: 1 });
    startTransition(() => router.refresh());
  };

  async function sync() {
    setState({ running: true, progress: 0, message: "Connexion à Steam…" });
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      const warnings: string[] = [];
      for (;;) {
        const { value, done: finished } = await reader.read();
        if (finished) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines.filter(Boolean)) {
          const ev: SyncEvent = JSON.parse(line);
          if ("error" in ev) {
            setState({ running: false, progress: 0, error: ev.error });
            return;
          }
          if (ev.warning) warnings.push(ev.message);
          setState({ running: true, progress: ev.progress, message: ev.message });
        }
      }
      done();
      // Étapes facultatives en échec : la synchro a abouti, mais on le signale
      if (warnings.length) setState({ running: false, progress: 1, error: warnings.join(" · ") });
    } catch (e) {
      setState({ running: false, progress: 0, error: e instanceof Error ? e.message : String(e) });
    }
  }

  async function demo() {
    setState({ running: true, progress: 0.6, message: "Chargement de la démo…" });
    await fetch("/api/demo", { method: "POST" });
    done();
  }

  const dismiss = () => setState({ running: false, progress: 0 });

  return { ...state, busy: state.running || refreshing, sync, demo, dismiss };
}
