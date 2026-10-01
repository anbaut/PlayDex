import { ImageResponse } from "next/og";
import { loadAppData } from "@/lib/data";
import { num } from "@/lib/format";

/** Carte de profil partageable (PNG 1200 × 630). */
export async function GET() {
  const data = await loadAppData();
  if (!data) return new Response("Pas de bibliothèque", { status: 404 });
  const { library, profile, achievements } = data;
  const games = library.games;
  const total = games.reduce((s, g) => s + g.hours, 0);
  const byId = new Map(games.map((g) => [g.appid, g]));
  const top = profile.top3.map((id) => byId.get(id)!).filter(Boolean);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#07090f", color: "#e8eaf0", padding: 56, fontFamily: "sans-serif", position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", opacity: 0.6 }}>
          {top.map((g) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={g.appid} src={g.hero ?? g.cover} alt="" width={400} height={630} style={{ width: 400, height: 630, objectFit: "cover" }} />
          ))}
        </div>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", background: "linear-gradient(90deg, #07090f 38%, rgba(7,9,15,.55) 70%, rgba(7,9,15,.25))" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {library.profile.avatar && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={library.profile.avatar} alt="" width={96} height={96} style={{ borderRadius: 24, border: "3px solid rgba(255,255,255,.2)" }} />
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 22, letterSpacing: 6, color: "#8b93a7", textTransform: "uppercase" }}>Playdex</div>
            <div style={{ fontSize: 56, fontWeight: 700 }}>{library.profile.persona}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 48, marginTop: 44 }}>
          {[
            [num(games.length), "jeux"],
            [num(total), "heures"],
            [num(achievements.totalUnlocked), "succès"],
            [`${Math.round((100 * games.filter((g) => g.playtimeMin > 0).length) / games.length)} %`, "Playdex complété"],
            [num(achievements.perfect.length), "jeux à 100 %"],
          ].map(([v, l]) => (
            <div key={l} style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 52, fontWeight: 700, color: "#22d3ee" }}>{v}</div>
              <div style={{ fontSize: 22, color: "#8b93a7" }}>{l}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 40 }}>
          {profile.traits.map((t) => (
            <div key={t.id} style={{ display: "flex", fontSize: 26, padding: "8px 18px", borderRadius: 999, background: "rgba(57,135,229,.2)", border: "2px solid rgba(57,135,229,.5)" }}>
              {t.emoji} {t.label}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", marginTop: "auto", fontSize: 24, color: "#8b93a7" }}>
          Tags préférés : {profile.topTags.slice(0, 3).map((t) => t.tag).join(" · ") || "–"}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
