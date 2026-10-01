"use client";
import { eur, hrs, num } from "@/lib/format";
import type { HistoryView } from "@/lib/history";
import type { Game } from "@/lib/types";
import GameGrid from "./GameGrid";
import { CountUp, SectionTitle } from "./ui";

export default function ShameTab({ games, history, igdb, onOpen }: {
  games: Game[]; history: HistoryView; igdb: boolean; onOpen: (g: Game) => void;
}) {
  const never = games.filter((g) => g.status === "never").sort((a, b) => (b.fullPrice ?? -1) - (a.fullPrice ?? -1));
  const tasted = games.filter((g) => g.status === "tasted").sort((a, b) => b.lastPlayed - a.lastPlayed);
  const dormant = never.reduce((s, g) => s + (g.fullPrice ?? 0), 0);

  // Temps pour tout finir : durée « normale » IGDB des jeux jamais lancés qui en ont une
  const timed = never.filter((g) => g.duration?.normally);
  const backlogHours = timed.reduce((s, g) => s + (g.duration?.normally ?? 0), 0);
  // Rythme : moyenne hebdo de l'historique, sinon les 2 dernières semaines de Steam
  const perWeek = history.weeks.length
    ? history.weeks.reduce((s, w) => s + w.hours, 0) / history.weeks.length
    : games.reduce((s, g) => s + g.hours2w, 0) / 2;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <SectionTitle title="Le mur de la honte">
          <b>{never.length} jeux</b> achetés et jamais lancés. Les plus chers d&apos;abord, pour que ça pique.
          Survole une jaquette pour lui redonner des couleurs.
        </SectionTitle>
        <div className="mb-6 flex gap-10 text-right">
          {timed.length > 0 && (
            <div>
              <div className="font-display text-5xl font-bold text-accent-2 tabular-nums">
                <CountUp value={backlogHours} format={(v) => `${num(v)} h`} />
              </div>
              <div className="text-sm text-muted">
                pour les finir ({timed.length} jeux connus d&apos;IGDB)
                {perWeek > 0 && <>, soit <b className="text-ink">{num(backlogHours / perWeek / 52, 1)} ans</b> à {hrs(perWeek)}/semaine</>}
              </div>
            </div>
          )}
          <div>
            <div className="font-display text-5xl font-bold text-amber-300 tabular-nums">
              <CountUp value={dormant} format={(v) => eur(v)} />
            </div>
            <div className="text-sm text-muted">qui dorment dans ta bibliothèque</div>
          </div>
        </div>
      </div>
      {!igdb && (
        <p className="-mt-4 mb-6 text-xs text-muted">
          Astuce : ajoute des identifiants IGDB dans <code>.env.local</code> pour savoir combien de temps il te faudrait pour tout finir (voir README).
        </p>
      )}
      <GameGrid games={never} ghost onOpen={onOpen} />

      {tasted.length > 0 && (
        <div className="mt-14">
          <SectionTitle title="Goûtés, puis oubliés">
            <b>{tasted.length} jeux</b> lancés moins de 2 heures, puis plus jamais.
          </SectionTitle>
          <GameGrid games={tasted} ghost onOpen={onOpen} />
        </div>
      )}
    </div>
  );
}
