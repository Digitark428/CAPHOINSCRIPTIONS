import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TournoiActions } from "@/components/TournoiActions";
import { LIBELLE_TYPE, type TypeTournoi } from "@/lib/types";
import { calculerFinances, formatEuro } from "@/lib/finance";

export const dynamic = "force-dynamic";

export default async function HistoriquePage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("tournois")
    .select(
      "id, nom, type, date_tournoi, rentree_buvette, depense_buvette, rentree_inscriptions_manuelle, equipes(id), achats_divers(montant), frais_association(montant)"
    )
    .eq("is_historique", true)
    .order("date_tournoi", { ascending: true, nullsFirst: true });

  const liste = (data ?? []) as any[];

  const total = liste.reduce((acc, t) => {
    const f = calculerFinances({
      rentreeInscriptions: Number(t.rentree_inscriptions_manuelle ?? 0),
      rentreeBuvette: Number(t.rentree_buvette),
      depenseBuvette: Number(t.depense_buvette),
      achatsDivers: (t.achats_divers ?? []).map((a: any) => ({ description: "", montant: a.montant })),
      fraisAssociation: (t.frais_association ?? []).map((a: any) => ({ description: "", montant: a.montant })),
    });
    return acc + f.beneficeNet;
  }, 0);

  return (
    <div>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="display-tight text-3xl font-semibold text-encre">
            Historique
          </h1>
          <p className="mt-1 text-sm text-ardoise">
            {liste.length} tournoi{liste.length > 1 ? "s" : ""} archivé
            {liste.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="rounded-2xl border border-brume bg-nuage px-5 py-3 text-right">
          <div className="text-[11px] uppercase tracking-wide text-ardoise">
            Bénéfice cumulé
          </div>
          <div
            className={`display text-xl font-semibold ${
              total >= 0 ? "text-[#1E8E3E]" : "text-nonpaye"
            }`}
          >
            {formatEuro(total)}
          </div>
        </div>
      </div>

      {liste.length === 0 ? (
        <div className="card p-12 text-center text-ardoise">
          Aucun tournoi archivé. Archivez un tournoi depuis son tableau de bord
          pour le retrouver ici.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-brume">
          <table className="w-full text-sm">
            <thead className="bg-nuage text-left text-xs uppercase tracking-wide text-ardoise">
              <tr>
                <th className="px-4 py-3 font-medium">Tournoi</th>
                <th className="px-4 py-3 font-medium">Format</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Date</th>
                <th className="px-4 py-3 text-center font-medium">Équipes</th>
                <th className="px-4 py-3 text-right font-medium">Bénéfice</th>
                <th className="px-2 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brume bg-blanc">
              {liste.map((t) => {
                const f = calculerFinances({
                  rentreeInscriptions: Number(t.rentree_inscriptions_manuelle ?? 0),
                  rentreeBuvette: Number(t.rentree_buvette),
                  depenseBuvette: Number(t.depense_buvette),
                  achatsDivers: (t.achats_divers ?? []).map((a: any) => ({ description: "", montant: a.montant })),
                  fraisAssociation: (t.frais_association ?? []).map((a: any) => ({ description: "", montant: a.montant })),
                });
                return (
                  <tr key={t.id} className="transition hover:bg-nuage/60">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/historique/${t.id}`}
                        className="font-medium text-encre hover:underline"
                      >
                        {t.nom}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ardoise">
                      {LIBELLE_TYPE[t.type as TypeTournoi]}
                    </td>
                    <td className="hidden px-4 py-3 text-ardoise sm:table-cell">
                      {t.date_tournoi
                        ? new Date(t.date_tournoi).toLocaleDateString("fr-FR")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-ardoise">
                      {t.equipes?.length ?? 0}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${
                        f.beneficeNet >= 0 ? "text-[#1E8E3E]" : "text-nonpaye"
                      }`}
                    >
                      {formatEuro(f.beneficeNet)}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex justify-end">
                        <TournoiActions id={t.id} isHistorique={true} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
