const nf = (dec: number) =>
  new Intl.NumberFormat("fr-FR", { minimumFractionDigits: dec, maximumFractionDigits: dec });

export const num = (x: number, dec = 0) => nf(dec).format(x);

// Espaces insécables entre nombre et unité : « 1 996 h » ne se coupe jamais en deux lignes
const NBSP = " ";

export const eur = (x: number, dec = 0) => `${num(x, dec)}${NBSP}€`;

export function hrs(h: number): string {
  if (h === 0) return `0${NBSP}h`;
  if (h < 1) return `${Math.round(h * 60)}${NBSP}min`;
  return `${num(h, h < 10 ? 1 : 0)}${NBSP}h`;
}

export function ago(unix: number): string {
  if (!unix) return "jamais";
  const days = Math.floor((Date.now() / 1000 - unix) / 86400);
  if (days < 1) return "aujourd'hui";
  if (days < 31) return `il y a ${days} j`;
  if (days < 365) return `il y a ${Math.floor(days / 30)} mois`;
  const years = Math.floor(days / 365);
  return `il y a ${years} an${years > 1 ? "s" : ""}`;
}

export const pct = (x: number) => `${Math.round(x * 100)} %`;

export const storeUrl = (appid: number) => `https://store.steampowered.com/app/${appid}`;

const ENTITIES: Record<string, string> = { nbsp: NBSP, amp: "&", quot: '"', apos: "'", lt: "<", gt: ">" };

/** Certains textes Steam (noms de succès…) contiennent des entités HTML : « bue&nbsp;! ». */
export const decodeEntities = (s: string) =>
  s.replace(/&(#\d+|#x[\da-f]+|\w+);/gi, (m, e: string) =>
    e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : (ENTITIES[e.toLowerCase()] ?? m),
  );

/** « N° 042 » : numéro de Dex sur 3 chiffres minimum. */
export const dexNo = (n: number) => `N° ${String(n).padStart(3, "0")}`;
