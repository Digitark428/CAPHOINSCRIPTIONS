/**
 * finance.ts — Logique financière CAP HOMARD
 * -------------------------------------------------------------
 * Formules reprises À L'IDENTIQUE du fichier
 * "GESTION_Tournoi_CAP_HOMARD_.csv".
 *
 * Vérifié sur 13 tournois historiques (voir scripts/verify-finance.ts) :
 *
 *   Bénéfice net =
 *        Rentrée inscriptions
 *      + Rentrée buvette
 *      − Dépense buvette
 *      − Total achats divers
 *      − Total frais association
 *
 * où :
 *   Total recettes  = Rentrée inscriptions + Rentrée buvette
 *   Total dépenses  = Dépense buvette + Total achats divers + Total frais
 *   Bénéfice net    = Total recettes − Total dépenses
 *
 * Pour un tournoi EN COURS, la "Rentrée inscriptions" est calculée
 * automatiquement à partir des joueurs cochés "payé" :
 *
 *   Rentrée inscriptions (auto) = (nb de joueurs payés) × tarif_par_joueur
 *
 * Pour les tournois HISTORIQUES importés, on conserve le montant réel
 * saisi dans le fichier (parfois différent de la somme par équipe).
 */

export interface LigneMontant {
  description: string;
  montant: number | null;
}

export interface FinanceInput {
  /** Rentrée totale des inscriptions (€). */
  rentreeInscriptions: number;
  /** Recette buvette (€). Champ libre. */
  rentreeBuvette: number;
  /** Dépense buvette (€). Champ libre. */
  depenseBuvette: number;
  /** Lignes "Achats divers" (matériel, staff, vidéaste…). */
  achatsDivers: LigneMontant[];
  /** Lignes "Frais association / mois" (assurances, abonnements…). */
  fraisAssociation: LigneMontant[];
}

export interface FinanceResult {
  rentreeInscriptions: number;
  rentreeBuvette: number;
  depenseBuvette: number;
  totalAchatsDivers: number;
  totalFraisAssociation: number;
  totalRecettes: number;
  totalDepenses: number;
  beneficeNet: number;
}

/** Somme sûre d'une liste de lignes (les montants null valent 0). */
export function sommeLignes(lignes: LigneMontant[]): number {
  return round2(
    (lignes ?? []).reduce((acc, l) => acc + (l.montant ?? 0), 0)
  );
}

/** Arrondi comptable à 2 décimales (évite les 0.1+0.2 = 0.30000000004). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Calcul complet du bilan d'un tournoi — reproduit la feuille Excel.
 */
export function calculerFinances(input: FinanceInput): FinanceResult {
  const totalAchatsDivers = sommeLignes(input.achatsDivers);
  const totalFraisAssociation = sommeLignes(input.fraisAssociation);

  const totalRecettes = round2(input.rentreeInscriptions + input.rentreeBuvette);
  const totalDepenses = round2(
    input.depenseBuvette + totalAchatsDivers + totalFraisAssociation
  );
  const beneficeNet = round2(totalRecettes - totalDepenses);

  return {
    rentreeInscriptions: round2(input.rentreeInscriptions),
    rentreeBuvette: round2(input.rentreeBuvette),
    depenseBuvette: round2(input.depenseBuvette),
    totalAchatsDivers,
    totalFraisAssociation,
    totalRecettes,
    totalDepenses,
    beneficeNet,
  };
}

/* ----------------------------------------------------------------
 *  Calculs liés aux équipes / joueurs (tournoi en cours)
 * ---------------------------------------------------------------- */

export interface Joueur {
  nom: string;
  paye: boolean;
}

export interface Equipe {
  id: string;
  nom: string;
  joueurs: Joueur[];
}

export type StatutPaiement = "non_paye" | "partiel" | "paye";

/** Montant dû par une équipe = nb de joueurs × tarif. */
export function montantDu(equipe: Equipe, tarifParJoueur: number): number {
  return round2(equipe.joueurs.length * tarifParJoueur);
}

/** Montant déjà payé = nb de joueurs cochés "payé" × tarif. */
export function montantPaye(equipe: Equipe, tarifParJoueur: number): number {
  const payes = equipe.joueurs.filter((j) => j.paye).length;
  return round2(payes * tarifParJoueur);
}

/** Montant restant dû par une équipe. */
export function montantRestant(equipe: Equipe, tarifParJoueur: number): number {
  return round2(montantDu(equipe, tarifParJoueur) - montantPaye(equipe, tarifParJoueur));
}

/** Statut automatique d'une équipe. */
export function statutEquipe(equipe: Equipe): StatutPaiement {
  const total = equipe.joueurs.length;
  const payes = equipe.joueurs.filter((j) => j.paye).length;
  if (payes === 0) return "non_paye";
  if (payes >= total) return "paye";
  return "partiel";
}

/** Couleur associée à un statut (classes / hex utilisées côté UI). */
export const COULEUR_STATUT: Record<StatutPaiement, string> = {
  non_paye: "#EF4444", // rouge
  partiel: "#F59E0B", // orange
  paye: "#22C55E", // vert
};

export const LIBELLE_STATUT: Record<StatutPaiement, string> = {
  non_paye: "Non payé",
  partiel: "Paiement partiel",
  paye: "Payé",
};

/** Rentrée inscriptions AUTOMATIQUE = total des joueurs payés × tarif. */
export function rentreeInscriptionsAuto(
  equipes: Equipe[],
  tarifParJoueur: number
): number {
  const joueursPayes = equipes.reduce(
    (acc, e) => acc + e.joueurs.filter((j) => j.paye).length,
    0
  );
  return round2(joueursPayes * tarifParJoueur);
}

export interface StatsTournoi {
  nbEquipes: number;
  nbJoueurs: number;
  nbJoueursPayes: number;
  montantTotalInscriptions: number; // dû (tous joueurs)
  montantEncaisse: number; // payé
  montantRestant: number;
  equipesPayees: number;
  equipesPartielles: number;
  equipesNonPayees: number;
}

/** Statistiques du dashboard principal. */
export function statsTournoi(
  equipes: Equipe[],
  tarifParJoueur: number
): StatsTournoi {
  const nbJoueurs = equipes.reduce((a, e) => a + e.joueurs.length, 0);
  const nbJoueursPayes = equipes.reduce(
    (a, e) => a + e.joueurs.filter((j) => j.paye).length,
    0
  );
  let payees = 0,
    partielles = 0,
    nonPayees = 0;
  for (const e of equipes) {
    const s = statutEquipe(e);
    if (s === "paye") payees++;
    else if (s === "partiel") partielles++;
    else nonPayees++;
  }
  return {
    nbEquipes: equipes.length,
    nbJoueurs,
    nbJoueursPayes,
    montantTotalInscriptions: round2(nbJoueurs * tarifParJoueur),
    montantEncaisse: round2(nbJoueursPayes * tarifParJoueur),
    montantRestant: round2((nbJoueurs - nbJoueursPayes) * tarifParJoueur),
    equipesPayees: payees,
    equipesPartielles: partielles,
    equipesNonPayees: nonPayees,
  };
}

/** Formatage € façon FR : "1 234,50 €". */
export function formatEuro(n: number | null | undefined): string {
  const v = n ?? 0;
  return (
    v.toLocaleString("fr-FR", {
      minimumFractionDigits: v % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }) + " €"
  );
}
