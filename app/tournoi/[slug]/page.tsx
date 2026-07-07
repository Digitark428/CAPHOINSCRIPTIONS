import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { InscriptionForm } from "@/components/InscriptionForm";
import { ListeAttente } from "@/components/ListeAttente";
import { Brand } from "@/components/Brand";
import { PosterVignette } from "@/components/PosterVignette";
import { LIBELLE_TYPE, type TypeTournoi } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PageInscription({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createClient();
  const { data } = await supabase
    .rpc("tournoi_public", { p_slug: params.slug })
    .maybeSingle();

  const tournoi = data as
    | {
        id: string;
        nom: string;
        type: TypeTournoi;
        date_tournoi: string | null;
        tarif_par_joueur: number;
        statut: string;
        is_historique: boolean;
        image_url: string | null;
        max_equipes: number | null;
        nb_equipes: number;
      }
    | null;

  if (!tournoi) {
    return (
      <Enveloppe>
        <div className="card p-10 text-center">
          <h1 className="display text-2xl font-semibold text-encre">
            Tournoi introuvable
          </h1>
          <p className="mt-2 text-ardoise">
            Ce lien d&apos;inscription n&apos;existe pas ou a expiré.
          </p>
          <Link href="/inscription" className="btn-ghost mt-6">
            Voir les tournois ouverts
          </Link>
        </div>
      </Enveloppe>
    );
  }

  const ferme = tournoi.statut !== "ouvert" || tournoi.is_historique;
  const placesRestantes =
    tournoi.max_equipes != null
      ? Math.max(0, tournoi.max_equipes - tournoi.nb_equipes)
      : null;
  const complet = placesRestantes === 0;
  const dateFmt = tournoi.date_tournoi
    ? new Date(tournoi.date_tournoi).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <Enveloppe>
      {/* Hero immersif : l'affiche du tournoi en grand */}
      <div className="mb-8 overflow-hidden rounded-3xl border border-brume shadow-carte">
        <PosterVignette
          src={tournoi.image_url}
          alt={`Affiche ${tournoi.nom}`}
          ratio="16/9"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
              {LIBELLE_TYPE[tournoi.type] ?? "Tournoi"} · Inscription
            </p>
            <h1 className="display-tight text-3xl font-semibold leading-tight text-white sm:text-4xl">
              {tournoi.nom}
            </h1>
            {dateFmt && (
              <p className="mt-1.5 capitalize text-white/85">{dateFmt}</p>
            )}
          </div>
        </PosterVignette>
      </div>

      {ferme ? (
        <div className="card p-10 text-center">
          <h2 className="display text-xl font-semibold text-encre">
            Inscriptions closes
          </h2>
          <p className="mt-2 text-ardoise">
            Les inscriptions pour ce tournoi ne sont plus ouvertes.
          </p>
          <Link href="/inscription" className="btn-ghost mt-6">
            Voir les autres tournois
          </Link>
        </div>
      ) : complet ? (
        <ListeAttente
          slug={params.slug}
          tarifParJoueur={Number(tournoi.tarif_par_joueur)}
          maxEquipes={tournoi.max_equipes}
        />
      ) : (
        <InscriptionForm
          slug={params.slug}
          tarifParJoueur={Number(tournoi.tarif_par_joueur)}
          placesRestantes={placesRestantes}
        />
      )}
    </Enveloppe>
  );
}

function Enveloppe({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-8 sm:py-10">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/">
          <Brand />
        </Link>
        <Link
          href="/inscription"
          className="text-[13px] font-medium text-ardoise transition hover:text-encre"
        >
          ← Tous les tournois
        </Link>
      </div>
      {children}
      <footer className="mt-10 text-center text-xs text-ardoise">
        CAP HOMARD BEACH VOLLEY 974
      </footer>
    </main>
  );
}
