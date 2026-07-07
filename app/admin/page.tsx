import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CreateTournoi } from "@/components/CreateTournoi";
import { PosterVignette } from "@/components/PosterVignette";
import { TournoiActions } from "@/components/TournoiActions";
import { LIBELLE_TYPE, type TypeTournoi } from "@/lib/types";
import { formatEuro } from "@/lib/finance";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const supabase = createClient();
  const { data: tournois } = await supabase
    .from("tournois")
    .select(
      "id, nom, slug, type, date_tournoi, tarif_par_joueur, statut, image_url, max_equipes, equipes(id, liste_attente, joueurs(id, paye))"
    )
    .eq("is_historique", false)
    .order("created_at", { ascending: false });

  const liste = (tournois ?? []) as any[];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="display-tight text-3xl font-semibold text-encre">
            Tournois
          </h1>
          <p className="mt-1 text-sm text-ardoise">
            {liste.length} tournoi{liste.length > 1 ? "s" : ""} en cours
          </p>
        </div>
        <CreateTournoi />
      </div>

      {liste.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="mx-auto max-w-md text-ardoise">
            Aucun tournoi pour l&apos;instant. Créez votre premier tournoi pour
            l&apos;ajouter au lien d&apos;inscription public.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {liste.map((t) => {
            const inscrites = (t.equipes ?? []).filter(
              (e: any) => !e.liste_attente
            );
            const nbAttente = (t.equipes?.length ?? 0) - inscrites.length;
            const nbEquipes = inscrites.length;
            const nbJoueurs = inscrites.reduce(
              (a: number, e: any) => a + (e.joueurs?.length ?? 0),
              0
            );
            const nbPayes = inscrites.reduce(
              (a: number, e: any) =>
                a + (e.joueurs?.filter((j: any) => j.paye).length ?? 0),
              0
            );
            const encaisse = nbPayes * Number(t.tarif_par_joueur);
            const complet =
              t.max_equipes != null && nbEquipes >= t.max_equipes;
            const ouvert = t.statut === "ouvert";
            return (
              <div key={t.id} className="group relative">
                <div className="absolute right-3 top-3 z-10">
                  <TournoiActions id={t.id} isHistorique={false} />
                </div>
                <Link
                  href={`/admin/tournoi/${t.id}`}
                  className="card block overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:shadow-flotte"
                >
                  <div className="relative">
                    <PosterVignette
                      src={t.image_url}
                      alt={`Affiche ${t.nom}`}
                      ratio="3/2"
                    />
                    <span
                      className={`chip absolute left-3 top-3 backdrop-blur ${
                        !ouvert || complet
                          ? "bg-anthracite/85 text-white"
                          : "bg-white/85 text-encre"
                      }`}
                    >
                      {!ouvert
                        ? "Inscriptions closes"
                        : complet
                          ? "Complet"
                          : "Ouvert"}
                    </span>
                    {nbAttente > 0 && (
                      <span className="chip absolute left-3 top-11 bg-white/85 text-encre backdrop-blur">
                        +{nbAttente} en attente
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <p className="eyebrow mb-2">
                      {LIBELLE_TYPE[t.type as TypeTournoi]}
                    </p>
                    <h2 className="display text-lg font-semibold leading-tight text-encre">
                      {t.nom}
                    </h2>
                    {t.date_tournoi && (
                      <p className="mt-1 text-sm capitalize text-ardoise">
                        {new Date(t.date_tournoi).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    )}
                    <div className="mt-4 grid grid-cols-3 gap-2 border-t border-brume pt-4 text-center">
                      <Stat v={nbEquipes} l="Équipes" />
                      <Stat v={nbJoueurs} l="Joueurs" />
                      <Stat v={formatEuro(encaisse)} l="Encaissé" />
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ v, l }: { v: string | number; l: string }) {
  return (
    <div>
      <div className="display text-base font-semibold text-encre">{v}</div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wide text-ardoise">
        {l}
      </div>
    </div>
  );
}
