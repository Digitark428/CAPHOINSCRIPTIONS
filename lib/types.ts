export type TypeTournoi = "4x4" | "3x3" | "mixte" | "beach_camp" | "autre";
export type StatutTournoi = "ouvert" | "cloture";

export interface Tournoi {
  id: string;
  nom: string;
  slug: string;
  type: TypeTournoi;
  date_tournoi: string | null;
  tarif_par_joueur: number;
  statut: StatutTournoi;
  is_historique: boolean;
  image_url: string | null;
  max_equipes: number | null;
  rentree_buvette: number;
  depense_buvette: number;
  rentree_inscriptions_manuelle: number | null;
  notes: string | null;
  created_at: string;
}

export interface JoueurRow {
  id: string;
  equipe_id: string;
  nom: string;
  paye: boolean;
  boisson: boolean;
  position: number;
}

export interface EquipeRow {
  id: string;
  tournoi_id: string;
  nom: string;
  contact_nom: string | null;
  contact_prenom: string | null;
  contact_telephone: string | null;
  liste_attente: boolean;
  montant_historique: number | null;
  created_at: string;
  joueurs: JoueurRow[];
}

export interface LigneFinance {
  id: string;
  tournoi_id: string;
  description: string;
  montant: number;
  position: number;
  fonction?: string | null;
}

export const LIBELLE_TYPE: Record<TypeTournoi, string> = {
  "4x4": "4 contre 4",
  "3x3": "3 contre 3",
  mixte: "Mixte",
  beach_camp: "Beach Camp",
  autre: "Autre",
};
