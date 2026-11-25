import Link from "next/link";

/** Identidad: sendero ascendente (progreso/formalización) sobre fondo verde petróleo, con acento ámbar (cuero). */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="PORVENIR TRABAJA" className="shrink-0">
      <rect width="48" height="48" rx="12" fill="hsl(190 75% 24%)" />
      <path d="M10 36c8 0 9-14 17-14s7 8 11 8" fill="none" stroke="hsl(32 90% 52%)" strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="38" cy="14" r="4.5" fill="#fff" />
      <path d="M10 36h28" stroke="#fff" strokeOpacity=".35" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ href = "/", inverted = false }: { href?: string; inverted?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 rounded-md" aria-label="PORVENIR TRABAJA - Inicio">
      <LogoMark />
      <span className={`flex flex-col leading-none ${inverted ? "text-white" : "text-primary"}`}>
        <span className="text-lg font-extrabold tracking-tight">PORVENIR</span>
        <span className="text-[0.8rem] font-semibold tracking-[0.2em] text-accent">TRABAJA</span>
      </span>
    </Link>
  );
}
