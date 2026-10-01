"use client";
import { AnimatePresence, motion } from "motion/react";
import {
  BarChart3, FlaskConical, Heart, LayoutGrid, Library as LibraryIcon, RefreshCw, Skull, Target, Trophy, UserRound, Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { overview } from "@/lib/analytics";
import type { AppData } from "@/lib/data";
import type { Game } from "@/lib/types";
import AchievementsTab from "./AchievementsTab";
import CollectionTab from "./CollectionTab";
import FriendsTab from "./FriendsTab";
import GameModal from "./GameModal";
import Logo from "./Logo";
import Hero from "./Hero";
import LibraryTab from "./LibraryTab";
import NextTab from "./NextTab";
import ProfileTab from "./ProfileTab";
import ShameTab from "./ShameTab";
import StatsTab from "./StatsTab";
import { SyncToast } from "./ui";
import { useSync } from "./useSync";
import WishlistTab, { isDeal } from "./WishlistTab";

const TABS = [
  { id: "library", label: "Bibliothèque", icon: LayoutGrid },
  { id: "shame", label: "Honte", icon: Skull },
  { id: "next", label: "À jouer", icon: Target },
  { id: "achievements", label: "Succès", icon: Trophy },
  { id: "collection", label: "Collection", icon: LibraryIcon },
  { id: "wishlist", label: "Wishlist", icon: Heart },
  { id: "friends", label: "Amis", icon: Users },
  { id: "stats", label: "Stats", icon: BarChart3 },
  { id: "profile", label: "Profil", icon: UserRound },
] as const;
type TabId = (typeof TABS)[number]["id"];

/** Au-delà, l'appli se resynchronise toute seule à l'ouverture (et alimente l'historique). */
const AUTO_SYNC_AFTER_S = 6 * 3600;

export default function Dashboard({ data, configured, igdb, initialTab }: {
  data: AppData; configured: boolean; igdb: boolean; initialTab?: string;
}) {
  const { library } = data;
  const [tab, setTabState] = useState<TabId>(TABS.some((t) => t.id === initialTab) ? (initialTab as TabId) : "library");
  // L'onglet vit dans l'URL (?tab=…) : un rechargement ou un lien retombe au même endroit
  const setTab = (id: TabId) => {
    setTabState(id);
    window.history.replaceState(null, "", id === "library" ? "/" : `?tab=${id}`);
  };
  const [selected, setSelected] = useState<Game | null>(null);
  const stats = useMemo(() => overview(library.games), [library.games]);
  const deals = useMemo(() => data.wishlist.filter(isDeal).length, [data.wishlist]);
  const sync = useSync();
  const close = useCallback(() => setSelected(null), []);
  const synced = new Date(library.syncedAt * 1000).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });

  const autoSynced = useRef(false);
  useEffect(() => {
    const stale = Date.now() / 1000 - library.syncedAt > AUTO_SYNC_AFTER_S;
    if (!autoSynced.current && configured && library.source === "steam" && stale) {
      autoSynced.current = true;
      sync.sync();
    }
  }, [configured, library.source, library.syncedAt, sync]);

  return (
    <main className="mx-auto max-w-[1440px] px-4 pb-24 sm:px-8">
      <header className="flex items-center justify-between gap-4 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-muted md:inline">
            {library.source === "demo" ? "Démo" : "Steam"} · {synced}
          </span>
          <button
            onClick={sync.demo}
            disabled={sync.busy}
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-sm font-semibold text-muted transition hover:text-ink disabled:opacity-50"
          >
            <FlaskConical className="size-4" /> Démo
          </button>
          <button
            onClick={() => sync.sync()}
            disabled={!configured || sync.busy}
            title={configured ? "Synchroniser avec Steam" : "Renseigne .env.local pour activer la synchro"}
            className="bg-gradient-accent inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition hover:brightness-110 disabled:opacity-40 disabled:shadow-none"
          >
            <RefreshCw className={`size-4 ${sync.running ? "animate-spin" : ""}`} /> Synchroniser
          </button>
        </div>
      </header>

      <Hero library={library} stats={stats} onOpen={setSelected} />

      <nav className="sticky top-3 z-30 mt-10 mb-8 flex justify-center">
        <div className="glass no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-full p-1.5 shadow-xl shadow-black/40">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`relative flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${tab === id ? "text-white" : "text-muted hover:text-ink"}`}
            >
              {tab === id && (
                <motion.span layoutId="tab-pill" className="bg-gradient-accent absolute inset-0 rounded-full shadow-lg shadow-accent/30"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }} />
              )}
              <Icon className="relative size-4" />
              <span className="relative">{label}</span>
              {id === "wishlist" && deals > 0 && (
                <span className="relative rounded-full bg-emerald-500 px-1.5 text-[11px] leading-5 text-white">{deals}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {tab === "library" && <LibraryTab games={library.games} onOpen={setSelected} />}
          {tab === "shame" && <ShameTab games={library.games} history={data.history} igdb={igdb} onOpen={setSelected} />}
          {tab === "next" && <NextTab games={library.games} onOpen={setSelected} />}
          {tab === "achievements" && <AchievementsTab games={library.games} view={data.achievements} onOpen={setSelected} />}
          {tab === "collection" && <CollectionTab games={library.games} series={data.series} studios={data.studios} onOpen={setSelected} />}
          {tab === "wishlist" && <WishlistTab games={library.games} wishlist={data.wishlist} onOpen={setSelected} />}
          {tab === "friends" && <FriendsTab games={library.games} view={data.social} onOpen={setSelected} />}
          {tab === "stats" && <StatsTab games={library.games} history={data.history} achievements={data.achievements} onOpen={setSelected} />}
          {tab === "profile" && <ProfileTab library={library} profile={data.profile} achievements={data.achievements} onOpen={setSelected} />}
        </motion.div>
      </AnimatePresence>

      <GameModal game={selected} onClose={close} />
      <SyncToast {...sync} onDismiss={sync.dismiss} />
    </main>
  );
}
