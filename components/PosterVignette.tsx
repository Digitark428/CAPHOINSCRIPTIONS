import { Logo } from "@/components/Brand";

/**
 * Affiche d'un tournoi. Affiche l'image si disponible, sinon un placeholder
 * monochrome discret (logo + trame). Le ratio est réglable ; `children`
 * permet de superposer un contenu (titre, dégradé) en mode hero.
 */
export function PosterVignette({
  src,
  alt,
  ratio = "4/5",
  className = "",
  children,
}: {
  src?: string | null;
  alt?: string;
  ratio?: "4/5" | "16/9" | "1/1" | "3/2";
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`relative w-full overflow-hidden bg-nuage ${className}`}
      style={{ aspectRatio: ratio.replace("/", " / ") }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt ?? ""}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="opacity-25">
            <Logo size={56} />
          </div>
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.5]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, rgba(0,0,0,0.03) 0 1px, transparent 1px 14px)",
            }}
          />
        </div>
      )}
      {children}
    </div>
  );
}
