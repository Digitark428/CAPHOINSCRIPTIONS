import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TournoiActions } from "@/components/TournoiActions";
import { PosterVignette } from "@/components/PosterVignette";
import { LIBELLE_TYPE, type TypeTournoi } from "@/lib/types";
import { calculerFinances, formatEuro } from "@/lib/finance";

export const dynamic = "force-dynamic";

export default async function HistoriqueDetail({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: t } = await supabase
    .from("tournois")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!t) notFound();

  const [{ data: equipes }, { data: achats }, { data: frais }] =
    await Promise.all([
      supabase.from("equipes").select("*").eq("tournoi_id", params.id).order("nom"),
      supabase.from("achats_divers").select("*").eq("tournoi_id", params.id).order("position"),
      supabase.from("frais_association").select("*").eq("tournoi_id", params.id).order("position"),
    ]);

  const f = calculerFinances({
    rentreeInscriptions: Number(t.rentree_inscriptions_manuelle ?? 0),
    rentreeBuvette: Number(t.rentree_buvette),
    depenseBuvette: Number(t.depense_buvette),
    achatsDivers: (achats ?? []).map((a: any) => ({ description: a.description, montant: a.montant })),
    fraisAssociation: (frais ?? []).map((a: any) => ({ description: a.description, montant: a.montant })),
  });

  return (
    <div className="print-area">
      <Link
        href="/admin/historique"
        className="no-print mb-4 inline-block text-sm text-ardoise hover:text-encre"
      >
        ← Retour à l&apos;historique
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          {t.image_url && (
            <div className="hidden w-24 shrink-0 overflow-hidden rounded-xl border border-brume sm:block">
              <PosterVignette src={t.image_url} alt={`Affiche ${t.nom}`} ratio="4/5" />
            </div>
          )}
          <div>
            <span className="chip mb-2 bg-nuage text-encre">
              {LIBELLE_TYPE[t.type as TypeTournoi]} · Archivé
            </span>
            <h1 className="display-tight text-2xl font-semibold text-encre">
              {t.nom}
            </h1>
          </div>
        </div>
        <div className="no-print flex gap-2">
          <TournoiActions
            id={t.id}
            isHistorique={true}
            variant="inline"
            redirectTo="/admin/historique"
          />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="display mb-4 text-lg font-semibold text-encre">
            Bilan financier
          </h2>
          <Row label="Rentrée inscriptions" value={formatEuro(f.rentreeInscriptions)} />
          <Row label="Rentrée buvette" value={formatEuro(f.rentreeBuvette)} />
          <Row label="Total recettes" value={formatEuro(f.totalRecettes)} bold />
          <div className="my-3 border-t border-brume" />
          <Row label="Dépense buvette" value={formatEuro(f.depenseBuvette)} />
          <Row label="Total achats divers" value={formatEuro(f.totalAchatsDivers)} />
          <Row label="Total frais association" value={formatEuro(f.totalFraisAssociation)} />
          <Row label="Total dépenses" value={formatEuro(f.totalDepenses)} bold />
          <div className="my-3 border-t border-brume" />
          <Row
            label="Bénéfice net"
            value={formatEuro(f.beneficeNet)}
            accent={f.beneficeNet >= 0 ? "paye" : "nonpaye"}
            bold
            big
          />
        </div>

        <div className="space-y-5">
          <DetailListe titre="Achats divers" lignes={achats ?? []} />
          <DetailListe titre="Frais association" lignes={frais ?? []} avecFonction />
        </div>
      </div>

      <div className="card mt-5 p-5">
        <h2 className="display mb-3 text-lg font-semibold text-encre">
          Équipes ({equipes?.length ?? 0})
        </h2>
        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {(equipes ?? []).map((e: any) => (
            <div
              key={e.id}
              className="flex items-center justify-between rounded-lg border border-brume bg-nuage/50 px-3 py-2 text-sm"
            >
              <span className="truncate text-encre">{e.nom}</span>
              {e.montant_historique != null && (
                <span className="ml-2 shrink-0 text-ardoise">
                  {formatEuro(Number(e.montant_historique))}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
  bold,
  big,
}: {
  label: string;
  value: string;
  accent?: "paye" | "nonpaye";
  bold?: boolean;
  big?: boolean;
}) {
  const color =
    accent === "paye"
      ? "text-[#1E8E3E]"
      : accent === "nonpaye"
        ? "text-nonpaye"
        : "text-encre";
  return (
    <div className="flex items-center justify-between py-1">
      <span className={bold ? "font-medium text-encre" : "text-ardoise"}>
        {label}
      </span>
      <span className={`display ${big ? "text-2xl" : ""} font-semibold ${color}`}>
        {value}
      </span>
    </div>
  );
}

function DetailListe({
  titre,
  lignes,
  avecFonction,
}: {
  titre: string;
  lignes: any[];
  avecFonction?: boolean;
}) {
  return (
    <div className="card p-5">
      <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-ardoise">
        {titre}
      </h3>
      {lignes.length === 0 ? (
        <p className="text-sm text-ardoise/70">Aucune ligne.</p>
      ) : (
        <div className="space-y-1.5 text-sm">
          {lignes.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-encre">{l.description || "—"}</div>
                {avecFonction && l.fonction && (
                  <div className="truncate text-xs text-ardoise/70">{l.fonction}</div>
                )}
              </div>
              <span className="shrink-0 text-ardoise">
                {formatEuro(Number(l.montant))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
