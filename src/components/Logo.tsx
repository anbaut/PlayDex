/** Le « dex » : un boîtier arrondi avec son voyant, et un bouton play. */
export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id="dex-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3987e5" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="9" fill="url(#dex-grad)" />
      <circle cx="8.5" cy="8.5" r="3" fill="#fff" />
      <circle cx="8.5" cy="8.5" r="1.4" fill="#22d3ee" />
      <path d="M13.5 11.5v11.2a1 1 0 0 0 1.5.86l9-5.6a1 1 0 0 0 0-1.72l-9-5.6a1 1 0 0 0-1.5.86Z" fill="#fff" />
    </svg>
  );
}

export default function Logo({ size = "text-lg" }: { size?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display font-bold tracking-tight ${size}`}>
      <LogoMark className="size-[1.6em]" />
      <span>
        play<span className="text-gradient">dex</span>
      </span>
    </span>
  );
}
