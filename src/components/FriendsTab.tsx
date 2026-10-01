"use client";
import { hrs, pct } from "@/lib/format";
import type { SocialView } from "@/lib/social";
import type { Game } from "@/lib/types";
import { Avatars, Badge, Bar, Cover, Empty, MiniGame, Panel, SectionTitle } from "./ui";

const CDN = (appid: number) => `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appid}/header.jpg`;

export default function FriendsTab({ games, view, onOpen }: { games: Game[]; view: SocialView | null; onOpen: (g: Game) => void }) {
  if (!view) return <Empty>Pas encore de données d&apos;amis : lance une synchronisation Steam.</Empty>;
  const byId = new Map(games.map((g) => [g.appid, g]));

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle title="Amis">
        <b>{view.friendCount} amis</b>, dont {view.publicCount} avec une bibliothèque publique.
      </SectionTitle>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="En ce moment chez tes amis" sub="Joué ces 2 dernières semaines.">
          <div className="flex flex-col gap-1">
            {view.nowPlaying.map((p) => {
              const mine = byId.get(p.appid);
              return (
                <MiniGame
                  key={p.appid}
                  cover={mine?.cover ?? CDN(p.appid)}
                  name={p.name}
                  sub={
                    <>
                      {p.friends.map((f) => `${f.name} (${hrs(f.hours2w)})`).join(", ")}
                      {mine && ` · toi : ${hrs(mine.hours)}`}
                    </>
                  }
                  right={<div className="flex flex-col items-end gap-1"><Avatars people={p.friends} max={4} />{p.owned && <Badge tone="accent">Tu l&apos;as</Badge>}</div>}
                  onClick={() => mine && onOpen(mine)}
                />
              );
            })}
            {!view.nowPlaying.length && <p className="text-sm text-muted">Personne n&apos;a joué ces deux dernières semaines.</p>}
          </div>
        </Panel>

        <Panel title="À lancer ensemble" sub="Tes jeux multijoueur que des amis possèdent aussi.">
          <div className="flex flex-col gap-1">
            {view.multi.map((m) => {
              const g = byId.get(m.appid);
              if (!g) return null;
              return (
                <MiniGame
                  key={m.appid}
                  cover={g.cover}
                  name={g.name}
                  sub={`${m.friends.length} ami${m.friends.length > 1 ? "s" : ""} · toi : ${hrs(g.hours)}`}
                  right={<Avatars people={m.friends} />}
                  onClick={() => onOpen(g)}
                />
              );
            })}
          </div>
        </Panel>
      </div>

      <Panel
        title="Compatibilité"
        sub={<>Jeux joués <b>par vous deux</b> ÷ jeux joués par au moins l&apos;un de vous (indice de Jaccard).</>}
      >
        <div className="mt-2 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {view.matches.map((f, i) => (
            <div key={f.steamid} className={`rounded-xl border p-3 ${i === 0 ? "border-accent/40 bg-accent/[.06]" : "border-line bg-white/[.02]"}`}>
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.avatar} alt="" className="size-10 rounded-full" />
                <div className="min-w-0 flex-1">
                  <a href={f.profileUrl} target="_blank" rel="noreferrer" className="block truncate font-semibold hover:text-accent-2">{f.name}</a>
                  <div className="text-xs text-muted">{f.common} jeux joués en commun</div>
                </div>
                <div className="font-display text-xl font-bold tabular-nums">{pct(f.compat)}</div>
              </div>
              <Bar value={f.compat / (view.matches[0]?.compat || 1)} className="mt-3" />
              <div className="mt-3 grid grid-cols-5 gap-1">
                {f.topCommon.map((id) => byId.get(id)).filter((g): g is Game => Boolean(g)).map((g) => (
                  <button key={g.appid} onClick={() => onOpen(g)} title={g.name} className="overflow-hidden rounded">
                    <Cover src={g.cover} alt={g.name} className="aspect-[460/215]" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
