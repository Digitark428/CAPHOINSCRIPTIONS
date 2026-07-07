"use client";

import * as XLSX from "xlsx";
import type { EquipeRow, LigneFinance, Tournoi } from "./types";
import {
  calculerFinances,
  montantDu,
  montantPaye,
  montantRestant,
  rentreeInscriptionsAuto,
  statutEquipe,
  LIBELLE_STATUT,
} from "./finance";

/** Exporte le bilan complet d'un tournoi dans un fichier .xlsx. */
export function exporterExcel(
  tournoi: Tournoi,
  equipes: EquipeRow[],
  achats: LigneFinance[],
  frais: LigneFinance[]
) {
  const tarif = Number(tournoi.tarif_par_joueur);

  const eqEquipe = equipes.map((e) => ({
    id: e.id,
    nom: e.nom,
    joueurs: (e.joueurs ?? []).map((j) => ({ nom: j.nom, paye: j.paye })),
  }));

  const rentreeInscriptions =
    tournoi.rentree_inscriptions_manuelle != null
      ? Number(tournoi.rentree_inscriptions_manuelle)
      : rentreeInscriptionsAuto(eqEquipe, tarif);

  const res = calculerFinances({
    rentreeInscriptions,
    rentreeBuvette: Number(tournoi.rentree_buvette),
    depenseBuvette: Number(tournoi.depense_buvette),
    achatsDivers: achats.map((a) => ({ description: a.description, montant: a.montant })),
    fraisAssociation: frais.map((f) => ({ description: f.description, montant: f.montant })),
  });

  const wb = XLSX.utils.book_new();

  // Feuille Équipes
  const equipesRows = equipes.map((e) => {
    const eq = { id: e.id, nom: e.nom, joueurs: (e.joueurs ?? []).map((j) => ({ nom: j.nom, paye: j.paye })) };
    return {
      Équipe: e.nom,
      "Liste d'attente": e.liste_attente ? "Oui" : "Non",
      Contact: `${e.contact_prenom ?? ""} ${e.contact_nom ?? ""}`.trim(),
      Téléphone: e.contact_telephone ?? "",
      Joueurs: (e.joueurs ?? []).map((j) => j.nom).join(", "),
      "Nb joueurs": e.joueurs?.length ?? 0,
      "Boissons récupérées": (e.joueurs ?? []).filter((j) => j.boisson).length,
      "Montant dû (€)": montantDu(eq, tarif),
      "Payé (€)": montantPaye(eq, tarif),
      "Restant (€)": montantRestant(eq, tarif),
      Statut: LIBELLE_STATUT[statutEquipe(eq)],
    };
  });
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(equipesRows),
    "Équipes"
  );

  // Feuille Finances
  const finRows: any[] = [
    { Poste: "RECETTES", Montant: "" },
    { Poste: "Rentrée inscriptions", Montant: res.rentreeInscriptions },
    { Poste: "Rentrée buvette", Montant: res.rentreeBuvette },
    { Poste: "Total recettes", Montant: res.totalRecettes },
    { Poste: "", Montant: "" },
    { Poste: "DÉPENSES", Montant: "" },
    { Poste: "Dépense buvette", Montant: res.depenseBuvette },
    ...achats.map((a) => ({ Poste: `Achat · ${a.description}`, Montant: a.montant })),
    { Poste: "Total achats divers", Montant: res.totalAchatsDivers },
    ...frais.map((f) => ({ Poste: `Frais · ${f.description}`, Montant: f.montant })),
    { Poste: "Total frais association", Montant: res.totalFraisAssociation },
    { Poste: "Total dépenses", Montant: res.totalDepenses },
    { Poste: "", Montant: "" },
    { Poste: "BÉNÉFICE NET", Montant: res.beneficeNet },
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(finRows),
    "Finances"
  );

  const nomFichier = `bilan_${tournoi.slug || "tournoi"}.xlsx`;
  XLSX.writeFile(wb, nomFichier);
}
