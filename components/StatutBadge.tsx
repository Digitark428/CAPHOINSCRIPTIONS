import { LIBELLE_STATUT, type StatutPaiement } from "@/lib/finance";

const STYLES: Record<StatutPaiement, string> = {
  non_paye: "bg-nonpaye/10 text-nonpaye",
  partiel: "bg-partiel/10 text-[#B26A00]",
  paye: "bg-paye/10 text-[#1E8E3E]",
};

const DOT: Record<StatutPaiement, string> = {
  non_paye: "#FF3B30",
  partiel: "#FF9F0A",
  paye: "#34C759",
};

export function StatutBadge({ statut }: { statut: StatutPaiement }) {
  return (
    <span className={`chip ${STYLES[statut]}`}>
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: DOT[statut] }}
      />
      {LIBELLE_STATUT[statut]}
    </span>
  );
}
