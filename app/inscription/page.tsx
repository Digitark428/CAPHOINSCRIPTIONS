import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Brand } from "@/components/Brand";
import { PosterVignette } from "@/components/PosterVignette";
import { LIBELLE_TYPE, type TypeTournoi } from "@/lib/types";
import { formatEuro } from "@/lib/finance";

export const dynamic = "force-dynamic";

interface TournoiOuvert {
  id: string;
  nom: string;
  slug: string;
  type: TypeTournoi;
  date_tournoi: string | null;
  tarif_par_joueur: number;
  image_url: string | null;
  max_equipes: number | null;
  nb_equipes: number;
}

function formatDate(d: string | null): string | null {
  if (!d) return null;
  return new Date(d).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function PageInscriptions() {
  const supabase = createClient();
  const { data } = await supabase.rpc("tournois_ouverts");
  const tournois = (data ?? []) as TournoiOuvert[];

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-8 sm:py-12">
      <header className="mb-10 flex items-center justify-between">
        <Link href="/">
          <Brand />
        </Link>
        <Link
          href="/login"
          className="text-[13px] font-medium text-ardoise transition hover:text-encre"
        >
          Espace organisateur
        </Link>
      </header>

      <div className="mb-10 max-w-2xl">
        <p className="eyebrow mb-3">Inscriptions ouvertes</p>
        <h1 className="display-tight text-4xl font-semibold leading-[1.05] text-encre sm:text-5xl">
          Choisissez votre tournoi.
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-ardoise">
          Sélectionnez le tournoi auquel votre équipe souhaite participer, puis
          renseignez votre composition. Le règlement se fait sur place le jour J.
        </p>
      </div>

      {tournois.length === 0 ? (
        <div className="card p-12 text-center">
          <h2 className="display text-xl font-semibold text-encre">
            Aucun tournoi ouvert pour le moment
          </h2>
          <p className="mx-auto mt-2 max-w-md text-ardoise">
            Les inscriptions ne sont pas encore ouvertes. Revenez un peu plus
            tard, ou contactez l&apos;organisation.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tournois.map((t) => {
            const complet =
              t.max_equipes != null && t.nb_equipes >= t.max_equipes;
            return (
              <Link
                key={t.id}
                href={`/tournoi/${t.slug}`}
                className="group card overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:shadow-flotte"
              >
                <div className="relative">
                  <PosterVignette
                    src={t.image_url}
                    alt={`Affiche ${t.nom}`}
                    ratio="4/5"
                  />
                  {complet && (
                    <span className="chip absolute left-3 top-3 bg-anthracite/90 text-white backdrop-blur">
                      Complet
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <p className="eyebrow mb-2">
                    {LIBELLE_TYPE[t.type] ?? "Tournoi"}
                  </p>
                  <h2 className="display text-lg font-semibold leading-tight text-encre">
                    {t.nom}
                  </h2>
                  {formatDate(t.date_tournoi) && (
                    <p className="mt-1 text-sm capitalize text-ardoise">
                      {formatDate(t.date_tournoi)}
                    </p>
                  )}
                  <div className="mt-4 flex items-center justify-between border-t border-brume pt-4">
                    <span className="text-sm text-ardoise">
                      {formatEuro(Number(t.tarif_par_joueur))} / joueur
                    </span>
                    <span
                      className={`text-[13px] font-medium transition ${
                        complet
                          ? "text-ardoise"
                          : "text-encre group-hover:translate-x-0.5"
                      }`}
                    >
                      {complet ? "Liste d'attente →" : "S'inscrire →"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <footer className="mt-14 border-t border-brume pt-6 text-center text-xs text-ardoise">
        CAP HOMARD BEACH VOLLEY 974 · La Réunion
      </footer>
    </main>
  );
}
