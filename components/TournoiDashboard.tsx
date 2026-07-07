"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/slug";
import { exporterExcel } from "@/lib/export";
import { uploadAffiche } from "@/lib/upload";
import { StatutBadge } from "@/components/StatutBadge";
import { PosterVignette } from "@/components/PosterVignette";
import { TournoiActions } from "@/components/TournoiActions";
import {
  calculerFinances,
  formatEuro,
  montantDu,
  montantPaye,
  montantRestant,
  rentreeInscriptionsAuto,
  statsTournoi,
  statutEquipe,
  type Equipe,
} from "@/lib/finance";
import { LIBELLE_TYPE, type EquipeRow, type LigneFinance, type Tournoi } from "@/lib/types";

type Tab = "apercu" | "equipes" | "finances";

interface Props {
  tournoi: Tournoi;
  equipesInit: EquipeRow[];
  achatsInit: LigneFinance[];
  fraisInit: LigneFinance[];
  baseUrl: string;
}

export function TournoiDashboard({
  tournoi: tournoiInit,
  equipesInit,
  achatsInit,
  fraisInit,
  baseUrl,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [tab, setTab] = useState<Tab>("apercu");
  const [tournoi, setTournoi] = useState(tournoiInit);
  const [equipes, setEquipes] = useState<EquipeRow[]>(equipesInit);
  const [achats, setAchats] = useState<LigneFinance[]>(achatsInit);
  const [frais, setFrais] = useState<LigneFinance[]>(fraisInit);
  const [afficheEnCours, setAfficheEnCours] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const tarif = Number(tournoi.tarif_par_joueur);

  // Les équipes en liste d'attente ne comptent ni dans le quota ni dans les finances.
  const equipesInscritesRows = useMemo(
    () => equipes.filter((e) => !e.liste_attente),
    [equipes]
  );

  const equipesCalc: Equipe[] = useMemo(
    () =>
      equipesInscritesRows.map((e) => ({
        id: e.id,
        nom: e.nom,
        joueurs: (e.joueurs ?? []).map((j) => ({ nom: j.nom, paye: j.paye })),
      })),
    [equipesInscritesRows]
  );

  const stats = useMemo(
    () => statsTournoi(equipesCalc, tarif),
    [equipesCalc, tarif]
  );

  const nbBoissons = useMemo(
    () =>
      equipesInscritesRows.reduce(
        (a, e) => a + e.joueurs.filter((j) => j.boisson).length,
        0
      ),
    [equipesInscritesRows]
  );
  const nbAttente = equipes.length - equipesInscritesRows.length;
  const complet =
    tournoi.max_equipes != null && stats.nbEquipes >= tournoi.max_equipes;

  const rentreeInscriptions = rentreeInscriptionsAuto(equipesCalc, tarif);
  const finances = useMemo(
    () =>
      calculerFinances({
        rentreeInscriptions,
        rentreeBuvette: Number(tournoi.rentree_buvette),
        depenseBuvette: Number(tournoi.depense_buvette),
        achatsDivers: achats.map((a) => ({ description: a.description, montant: a.montant })),
        fraisAssociation: frais.map((f) => ({ description: f.description, montant: f.montant })),
      }),
    [rentreeInscriptions, tournoi.rentree_buvette, tournoi.depense_buvette, achats, frais]
  );

  /* ---------------- Mutations ---------------- */

  async function toggleJoueur(equipeId: string, joueurId: string, paye: boolean) {
    setEquipes((prev) =>
      prev.map((e) =>
        e.id === equipeId
          ? { ...e, joueurs: e.joueurs.map((j) => (j.id === joueurId ? { ...j, paye } : j)) }
          : e
      )
    );
    await supabase.from("joueurs").update({ paye }).eq("id", joueurId);
  }

  async function supprimerEquipe(equipeId: string) {
    if (!confirm("Supprimer cette équipe ? Cette action est définitive.")) return;
    setEquipes((prev) => prev.filter((e) => e.id !== equipeId));
    await supabase.from("equipes").delete().eq("id", equipeId);
  }

  async function majTournoi(champ: keyof Tournoi, valeur: any) {
    setTournoi((prev) => ({ ...prev, [champ]: valeur }));
    await supabase.from("tournois").update({ [champ]: valeur }).eq("id", tournoi.id);
  }

  async function changerAffiche(file: File) {
    setAfficheEnCours(true);
    try {
      const url = await uploadAffiche(supabase, tournoi.id, file);
      await majTournoi("image_url", url);
    } catch {
      alert(
        "L'envoi de l'affiche a échoué. Vérifiez que le bucket « tournoi-images » existe (voir migration_v2.sql)."
      );
    } finally {
      setAfficheEnCours(false);
    }
  }

  async function dupliquer() {
    const nouveauNom = `${tournoi.nom} (copie)`;
    const { data, error } = await supabase
      .from("tournois")
      .insert({
        nom: nouveauNom,
        slug: `${slugify(tournoi.nom)}-${Date.now().toString(36)}`,
        type: tournoi.type,
        date_tournoi: null,
        tarif_par_joueur: tarif,
        statut: "ouvert",
        is_historique: false,
        image_url: tournoi.image_url,
      })
      .select("id")
      .single();
    if (error || !data) {
      alert("Erreur lors de la duplication.");
      return;
    }
    router.push(`/admin/tournoi/${data.id}`);
    router.refresh();
  }

  const lienPublic = `${baseUrl}/tournoi/${tournoi.slug}`;

  return (
    <div>
      {/* En-tête : affiche + titre + actions */}
      <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="w-full shrink-0 sm:w-44">
          <div className="overflow-hidden rounded-2xl border border-brume">
            <PosterVignette
              src={tournoi.image_url}
              alt={`Affiche ${tournoi.nom}`}
              ratio="4/5"
            />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) changerAffiche(f);
            }}
          />
          <button
            className="btn-ghost no-print mt-2 w-full text-sm"
            onClick={() => fileRef.current?.click()}
            disabled={afficheEnCours}
          >
            {afficheEnCours
              ? "Envoi…"
              : tournoi.image_url
                ? "Changer l'affiche"
                : "Ajouter une affiche"}
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="chip mb-2 bg-nuage text-encre">
                {LIBELLE_TYPE[tournoi.type]}
              </span>
              <h1 className="display-tight text-2xl font-semibold text-encre sm:text-3xl">
                {tournoi.nom}
              </h1>
              {tournoi.date_tournoi && (
                <p className="mt-1 capitalize text-ardoise">
                  {new Date(tournoi.date_tournoi).toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
            <span
              className={`chip ${
                tournoi.statut !== "ouvert"
                  ? "bg-anthracite text-white"
                  : complet
                    ? "bg-anthracite text-white"
                    : "bg-paye/10 text-[#1E8E3E]"
              }`}
            >
              {tournoi.statut !== "ouvert"
                ? "Inscriptions closes"
                : complet
                  ? "Complet"
                  : "Ouvert"}
            </span>
          </div>

          <div className="no-print mt-4 flex flex-wrap gap-2">
            <button
              className="btn-ghost"
              onClick={() => exporterExcel(tournoi, equipes, achats, frais)}
            >
              Export Excel
            </button>
            <button className="btn-ghost" onClick={() => window.print()}>
              Export PDF
            </button>
            <button className="btn-ghost" onClick={dupliquer}>
              Dupliquer
            </button>
            <TournoiActions
              id={tournoi.id}
              isHistorique={tournoi.is_historique}
              variant="inline"
              redirectTo="/admin"
            />
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="no-print mb-6 inline-flex rounded-xl border border-brume bg-nuage p-1">
        {(
          [
            ["apercu", "Aperçu"],
            [
              "equipes",
              `Équipes (${stats.nbEquipes}${nbAttente > 0 ? ` +${nbAttente}` : ""})`,
            ],
            ["finances", "Finances"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === id
                ? "bg-blanc text-encre shadow-carte"
                : "text-ardoise hover:text-encre"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "apercu" && (
        <Apercu
          tournoi={tournoi}
          stats={stats}
          finances={finances}
          lienPublic={lienPublic}
          nbBoissons={nbBoissons}
          onToggleStatut={() =>
            majTournoi("statut", tournoi.statut === "ouvert" ? "cloture" : "ouvert")
          }
          onTarif={(v: number) => majTournoi("tarif_par_joueur", v)}
          onPlaces={(v: number | null) => majTournoi("max_equipes", v)}
          tarif={tarif}
        />
      )}

      {tab === "equipes" && (
        <EquipesTab
          equipes={equipes}
          setEquipes={setEquipes}
          tarif={tarif}
          tournoiId={tournoi.id}
          onToggleJoueur={toggleJoueur}
          onSupprimer={supprimerEquipe}
        />
      )}

      {tab === "finances" && (
        <FinancesTab
          tournoi={tournoi}
          rentreeInscriptions={rentreeInscriptions}
          finances={finances}
          achats={achats}
          setAchats={setAchats}
          frais={frais}
          setFrais={setFrais}
          onBuvette={(champ: keyof Tournoi, v: number) => majTournoi(champ, v)}
        />
      )}
    </div>
  );
}

/* ============================================================
 *  Aperçu
 * ============================================================ */
function Apercu({
  tournoi,
  stats,
  finances,
  lienPublic,
  nbBoissons,
  onToggleStatut,
  onTarif,
  onPlaces,
  tarif,
}: any) {
  const [copie, setCopie] = useState(false);
  const placesLabel =
    tournoi.max_equipes != null
      ? `${stats.nbEquipes} / ${tournoi.max_equipes}`
      : `${stats.nbEquipes}`;
  const complet =
    tournoi.max_equipes != null && stats.nbEquipes >= tournoi.max_equipes;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Places"
          value={placesLabel}
          hint={
            tournoi.max_equipes != null
              ? complet
                ? "complet"
                : `${tournoi.max_equipes - stats.nbEquipes} restantes`
              : "illimité"
          }
          tone={complet ? "nonpaye" : undefined}
        />
        <StatCard label="Joueurs" value={stats.nbJoueurs} />
        <StatCard
          label="Inscriptions"
          value={formatEuro(stats.montantTotalInscriptions)}
          hint="dû (tous joueurs)"
        />
        <StatCard label="Encaissé" value={formatEuro(stats.montantEncaisse)} />
        <StatCard
          label="Boissons"
          value={`${nbBoissons} / ${stats.nbJoueurs}`}
          hint="récupérées"
        />
        <StatCard
          label="Bénéfice estimé"
          value={formatEuro(finances.beneficeNet)}
          tone={finances.beneficeNet >= 0 ? "paye" : "nonpaye"}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Équipes payées" value={stats.equipesPayees} dot="paye" />
        <StatCard
          label="Paiement partiel"
          value={stats.equipesPartielles}
          dot="partiel"
        />
        <StatCard label="Non payées" value={stats.equipesNonPayees} dot="nonpaye" />
      </div>

      {/* Lien d'inscription */}
      <div className="card no-print p-5">
        <h3 className="display mb-1 text-lg font-semibold text-encre">
          Lien d&apos;inscription public
        </h3>
        <p className="mb-3 text-sm text-ardoise">
          Ce tournoi apparaît aussi automatiquement dans le lien unique{" "}
          <span className="text-encre">/inscription</span>. Ce lien direct mène
          droit à son formulaire.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input readOnly value={lienPublic} className="input font-mono text-sm" />
          <button
            className="btn-primary shrink-0"
            onClick={() => {
              navigator.clipboard.writeText(lienPublic);
              setCopie(true);
              setTimeout(() => setCopie(false), 1500);
            }}
          >
            {copie ? "Copié ✓" : "Copier"}
          </button>
        </div>
      </div>

      {/* Réglages */}
      <div className="card no-print p-5">
        <h3 className="display mb-4 text-lg font-semibold text-encre">Réglages</h3>
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <label className="label">Tarif par joueur (€)</label>
            <input
              type="number"
              min="0"
              step="0.5"
              defaultValue={tarif}
              onBlur={(e) => onTarif(Number(e.target.value) || 0)}
              className="input w-32"
            />
          </div>
          <div>
            <label className="label">Places (équipes)</label>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="Illimité"
              defaultValue={tournoi.max_equipes ?? ""}
              onBlur={(e) => {
                const v = e.target.value.trim();
                onPlaces(v === "" ? null : Math.max(1, parseInt(v, 10)));
              }}
              className="input w-32"
            />
          </div>
          <div>
            <label className="label">Inscriptions</label>
            <button
              onClick={onToggleStatut}
              className={tournoi.statut === "ouvert" ? "btn-ghost" : "btn-primary"}
            >
              {tournoi.statut === "ouvert"
                ? "Ouvertes — clôturer"
                : "Closes — rouvrir"}
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-ardoise">
          Places : laissez vide pour un nombre illimité. Une fois le quota
          atteint, l&apos;inscription publique affiche « Tournoi complet ». Une
          fois clôturé, le tournoi disparaît du lien public.
        </p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone,
  dot,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "paye" | "nonpaye";
  dot?: "paye" | "partiel" | "nonpaye";
}) {
  const color =
    tone === "paye" ? "text-[#1E8E3E]" : tone === "nonpaye" ? "text-nonpaye" : "text-encre";
  const dotColor =
    dot === "paye" ? "#34C759" : dot === "partiel" ? "#FF9F0A" : "#FF3B30";
  return (
    <div className="card p-4">
      <div className="flex items-center gap-1.5">
        {dot && (
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: dotColor }}
          />
        )}
        <div className="text-[11px] font-medium uppercase tracking-wide text-ardoise">
          {label}
        </div>
      </div>
      <div className={`display mt-1 text-2xl font-semibold ${color}`}>{value}</div>
      {hint && <div className="text-[11px] text-ardoise/70">{hint}</div>}
    </div>
  );
}

/* ============================================================
 *  Équipes — édition complète
 * ============================================================ */
function EquipesTab({
  equipes,
  setEquipes,
  tarif,
  tournoiId,
  onToggleJoueur,
  onSupprimer,
}: {
  equipes: EquipeRow[];
  setEquipes: React.Dispatch<React.SetStateAction<EquipeRow[]>>;
  tarif: number;
  tournoiId: string;
  onToggleJoueur: (equipeId: string, joueurId: string, paye: boolean) => void;
  onSupprimer: (id: string) => void;
}) {
  const supabase = createClient();
  const [q, setQ] = useState("");
  const [expand, setExpand] = useState<string | null>(null);
  const [ajout, setAjout] = useState(false);

  const s = q.trim().toLowerCase();
  const matches = (e: EquipeRow) =>
    !s ||
    e.nom.toLowerCase().includes(s) ||
    e.joueurs.some((j) => j.nom.toLowerCase().includes(s)) ||
    `${e.contact_prenom ?? ""} ${e.contact_nom ?? ""}`.toLowerCase().includes(s);

  // Équipes inscrites (hors liste d'attente), triées par nom.
  const inscrites = useMemo(
    () =>
      equipes
        .filter((e) => !e.liste_attente && matches(e))
        .sort((a, b) =>
          a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" })
        ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [equipes, s]
  );

  // Liste d'attente, triée par ordre d'inscription (created_at croissant).
  const attenteOrdre = useMemo(
    () =>
      equipes
        .filter((e) => e.liste_attente)
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ),
    [equipes]
  );
  const attente = useMemo(
    () => attenteOrdre.filter(matches),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [attenteOrdre, s]
  );
  const rangDe = (id: string) => attenteOrdre.findIndex((x) => x.id === id) + 1;

  /* --- Mutations d'édition --- */
  async function majEquipe(equipeId: string, patch: Partial<EquipeRow>) {
    setEquipes((prev) =>
      prev.map((e) => (e.id === equipeId ? { ...e, ...patch } : e))
    );
    await supabase.from("equipes").update(patch).eq("id", equipeId);
  }

  async function majJoueur(equipeId: string, joueurId: string, nom: string) {
    setEquipes((prev) =>
      prev.map((e) =>
        e.id === equipeId
          ? { ...e, joueurs: e.joueurs.map((j) => (j.id === joueurId ? { ...j, nom } : j)) }
          : e
      )
    );
    await supabase.from("joueurs").update({ nom }).eq("id", joueurId);
  }

  async function toggleBoisson(equipeId: string, joueurId: string, boisson: boolean) {
    setEquipes((prev) =>
      prev.map((e) =>
        e.id === equipeId
          ? {
              ...e,
              joueurs: e.joueurs.map((j) =>
                j.id === joueurId ? { ...j, boisson } : j
              ),
            }
          : e
      )
    );
    await supabase.from("joueurs").update({ boisson }).eq("id", joueurId);
  }

  async function ajouterJoueur(equipeId: string) {
    const eq = equipes.find((e) => e.id === equipeId);
    const pos = (eq?.joueurs.length ?? 0) + 1;
    const { data } = await supabase
      .from("joueurs")
      .insert({ equipe_id: equipeId, nom: "", position: pos, paye: false })
      .select()
      .single();
    if (data)
      setEquipes((prev) =>
        prev.map((e) =>
          e.id === equipeId ? { ...e, joueurs: [...e.joueurs, data as any] } : e
        )
      );
  }

  async function supprimerJoueur(equipeId: string, joueurId: string) {
    setEquipes((prev) =>
      prev.map((e) =>
        e.id === equipeId
          ? { ...e, joueurs: e.joueurs.filter((j) => j.id !== joueurId) }
          : e
      )
    );
    await supabase.from("joueurs").delete().eq("id", joueurId);
  }

  // Promouvoir une équipe de la liste d'attente vers les équipes inscrites.
  async function promouvoir(equipeId: string) {
    setEquipes((prev) =>
      prev.map((e) => (e.id === equipeId ? { ...e, liste_attente: false } : e))
    );
    await supabase
      .from("equipes")
      .update({ liste_attente: false })
      .eq("id", equipeId);
  }

  async function ajouterEquipe(
    nom: string,
    joueurs: string[],
    contact: { nom: string; prenom: string; tel: string }
  ) {
    const { data, error } = await supabase
      .from("equipes")
      .insert({
        tournoi_id: tournoiId,
        nom,
        contact_nom: contact.nom || null,
        contact_prenom: contact.prenom || null,
        contact_telephone: contact.tel || null,
        liste_attente: false,
      })
      .select("id")
      .single();
    if (error || !data) {
      alert("Erreur lors de l'ajout.");
      return;
    }
    const rows = joueurs.map((n, i) => ({
      equipe_id: data.id,
      nom: n,
      position: i + 1,
      paye: false,
    }));
    const { data: js } = await supabase.from("joueurs").insert(rows).select();
    setEquipes((prev) => [
      ...prev,
      {
        id: data.id,
        tournoi_id: tournoiId,
        nom,
        contact_nom: contact.nom || null,
        contact_prenom: contact.prenom || null,
        contact_telephone: contact.tel || null,
        liste_attente: false,
        montant_historique: null,
        created_at: new Date().toISOString(),
        joueurs: (js as any[]) ?? [],
      },
    ]);
    setAjout(false);
  }

  const cardProps = {
    tarif,
    majEquipe,
    majJoueur,
    toggleBoisson,
    onToggleJoueur,
    ajouterJoueur,
    supprimerJoueur,
    onSupprimer,
  };

  return (
    <div>
      <div className="no-print mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <input
          className="input sm:max-w-xs"
          placeholder="Rechercher une équipe, un joueur, un contact…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="btn-primary" onClick={() => setAjout(true)}>
          + Ajouter une équipe
        </button>
      </div>

      {ajout && (
        <AjoutEquipe onCancel={() => setAjout(false)} onSave={ajouterEquipe} />
      )}

      {/* Équipes inscrites */}
      <div className="space-y-2">
        {inscrites.map((e) => (
          <CarteEquipe
            key={e.id}
            e={e}
            expanded={expand === e.id}
            onToggleExpand={() => setExpand(expand === e.id ? null : e.id)}
            {...cardProps}
          />
        ))}
        {inscrites.length === 0 && (
          <div className="card p-10 text-center text-ardoise">
            Aucune équipe{" "}
            {q ? "ne correspond à la recherche" : "inscrite pour l'instant"}.
          </div>
        )}
      </div>

      {/* Liste d'attente */}
      {attenteOrdre.length > 0 && (
        <div className="mt-8">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="display text-lg font-semibold text-encre">
              Équipes en liste d&apos;attente
            </h3>
            <span className="chip bg-anthracite text-white">
              {attenteOrdre.length}
            </span>
          </div>
          <p className="mb-3 text-sm text-ardoise">
            Par ordre d&apos;inscription. Si une équipe inscrite déclare forfait,
            promouvez la première de la liste (bouton « Faire passer inscrite »).
          </p>
          <div className="space-y-2">
            {attente.map((e) => (
              <CarteEquipe
                key={e.id}
                e={e}
                rang={rangDe(e.id)}
                onPromouvoir={() => promouvoir(e.id)}
                expanded={expand === e.id}
                onToggleExpand={() => setExpand(expand === e.id ? null : e.id)}
                {...cardProps}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* Carte d'une équipe (inscrite ou en liste d'attente), entièrement éditable. */
function CarteEquipe({
  e,
  tarif,
  expanded,
  onToggleExpand,
  majEquipe,
  majJoueur,
  toggleBoisson,
  onToggleJoueur,
  ajouterJoueur,
  supprimerJoueur,
  onSupprimer,
  rang,
  onPromouvoir,
}: {
  e: EquipeRow;
  tarif: number;
  expanded: boolean;
  onToggleExpand: () => void;
  majEquipe: (id: string, patch: Partial<EquipeRow>) => void;
  majJoueur: (equipeId: string, joueurId: string, nom: string) => void;
  toggleBoisson: (equipeId: string, joueurId: string, v: boolean) => void;
  onToggleJoueur: (equipeId: string, joueurId: string, v: boolean) => void;
  ajouterJoueur: (equipeId: string) => void;
  supprimerJoueur: (equipeId: string, joueurId: string) => void;
  onSupprimer: (id: string) => void;
  rang?: number;
  onPromouvoir?: () => void;
}) {
  const eq: Equipe = {
    id: e.id,
    nom: e.nom,
    joueurs: e.joueurs.map((j) => ({ nom: j.nom, paye: j.paye })),
  };
  const st = statutEquipe(eq);
  return (
    <div className="card overflow-hidden">
      <button
        onClick={onToggleExpand}
        className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-nuage"
      >
        {rang != null ? (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-anthracite text-xs font-semibold text-white">
            {rang}
          </span>
        ) : (
          <span
            className="h-9 w-1 shrink-0 rounded-full"
            style={{
              background:
                st === "paye" ? "#34C759" : st === "partiel" ? "#FF9F0A" : "#FF3B30",
            }}
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-encre">{e.nom}</div>
          <div className="text-xs text-ardoise">
            {e.joueurs.length} joueur{e.joueurs.length > 1 ? "s" : ""} ·{" "}
            {formatEuro(montantPaye(eq, tarif))} / {formatEuro(montantDu(eq, tarif))} · 🥤{" "}
            {e.joueurs.filter((j) => j.boisson).length}/{e.joueurs.length}
            {e.contact_prenom || e.contact_nom
              ? ` · ${e.contact_prenom ?? ""} ${e.contact_nom ?? ""}`.trimEnd()
              : ""}
          </div>
        </div>
        {rang == null && <StatutBadge statut={st} />}
        <span className="text-ardoise">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="border-t border-brume p-4">
          {onPromouvoir && (
            <button className="btn-primary mb-4 w-full" onClick={onPromouvoir}>
              ↑ Faire passer inscrite (retirer de la liste d&apos;attente)
            </button>
          )}

          <div className="mb-4">
            <label className="label">Nom de l&apos;équipe</label>
            <input
              className="input"
              defaultValue={e.nom}
              onBlur={(ev) => {
                const v = ev.target.value.trim();
                if (v && v !== e.nom) majEquipe(e.id, { nom: v });
              }}
            />
          </div>

          <div className="mb-4">
            <label className="label">Contact référent</label>
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                className="input"
                placeholder="Prénom"
                defaultValue={e.contact_prenom ?? ""}
                onBlur={(ev) =>
                  majEquipe(e.id, { contact_prenom: ev.target.value.trim() })
                }
              />
              <input
                className="input"
                placeholder="Nom"
                defaultValue={e.contact_nom ?? ""}
                onBlur={(ev) =>
                  majEquipe(e.id, { contact_nom: ev.target.value.trim() })
                }
              />
              <input
                className="input"
                type="tel"
                placeholder="Téléphone"
                defaultValue={e.contact_telephone ?? ""}
                onBlur={(ev) =>
                  majEquipe(e.id, { contact_telephone: ev.target.value.trim() })
                }
              />
            </div>
          </div>

          <label className="label">Joueurs, paiement &amp; boisson</label>
          <div className="space-y-2">
            {e.joueurs.map((j) => (
              <div key={j.id} className="flex flex-wrap items-center gap-2">
                <input
                  className="input min-w-[150px] flex-1"
                  placeholder="Nom du joueur"
                  defaultValue={j.nom}
                  onBlur={(ev) => {
                    const v = ev.target.value.trim();
                    if (v !== j.nom) majJoueur(e.id, j.id, v);
                  }}
                />
                <TogglePill
                  checked={j.paye}
                  onChange={(v) => onToggleJoueur(e.id, j.id, v)}
                  label="Payé"
                  tone="paye"
                />
                <TogglePill
                  checked={j.boisson}
                  onChange={(v) => toggleBoisson(e.id, j.id, v)}
                  label="🥤 Boisson"
                  tone="dark"
                />
                <button
                  className="btn-ghost px-3 text-nonpaye disabled:opacity-30"
                  onClick={() => supprimerJoueur(e.id, j.id)}
                  disabled={e.joueurs.length <= 1}
                  aria-label="Retirer le joueur"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            className="btn-ghost mt-2 text-sm"
            onClick={() => ajouterJoueur(e.id)}
          >
            + Ajouter un joueur
          </button>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-brume pt-3 text-sm">
            <div className="text-ardoise">
              Payé{" "}
              <span className="font-medium text-[#1E8E3E]">
                {formatEuro(montantPaye(eq, tarif))}
              </span>{" "}
              · Restant{" "}
              <span className="font-medium text-encre">
                {formatEuro(montantRestant(eq, tarif))}
              </span>
            </div>
            <button
              className="text-sm text-nonpaye hover:underline"
              onClick={() => onSupprimer(e.id)}
            >
              Supprimer l&apos;équipe
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AjoutEquipe({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (
    nom: string,
    joueurs: string[],
    contact: { nom: string; prenom: string; tel: string }
  ) => void;
}) {
  const [nom, setNom] = useState("");
  const [cNom, setCNom] = useState("");
  const [cPrenom, setCPrenom] = useState("");
  const [cTel, setCTel] = useState("");
  const [joueurs, setJoueurs] = useState<string[]>(["", "", "", ""]);
  const nbRemplis = joueurs.filter((j) => j.trim()).length;
  const ok = nom.trim() !== "" && nbRemplis >= 4;
  return (
    <div className="card mb-4 p-5">
      <div className="mb-3">
        <label className="label">Nom de l&apos;équipe</label>
        <input className="input" value={nom} onChange={(e) => setNom(e.target.value)} />
      </div>
      <label className="label">Contact référent (optionnel)</label>
      <div className="mb-3 grid gap-2 sm:grid-cols-3">
        <input
          className="input"
          placeholder="Prénom"
          value={cPrenom}
          onChange={(e) => setCPrenom(e.target.value)}
        />
        <input
          className="input"
          placeholder="Nom"
          value={cNom}
          onChange={(e) => setCNom(e.target.value)}
        />
        <input
          className="input"
          type="tel"
          placeholder="Téléphone"
          value={cTel}
          onChange={(e) => setCTel(e.target.value)}
        />
      </div>
      <label className="label">Joueurs</label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {joueurs.map((j, i) => (
          <input
            key={i}
            className="input"
            placeholder={`Joueur ${i + 1}${i < 4 ? " *" : ""}`}
            value={j}
            onChange={(e) =>
              setJoueurs((p) => p.map((x, idx) => (idx === i ? e.target.value : x)))
            }
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {joueurs.length < 8 && (
          <button
            className="btn-ghost"
            onClick={() => setJoueurs((p) => [...p, ""])}
          >
            + Joueur
          </button>
        )}
        <div className="flex-1" />
        <button className="btn-ghost" onClick={onCancel}>
          Annuler
        </button>
        <button
          className="btn-primary"
          disabled={!ok}
          onClick={() =>
            onSave(
              nom.trim(),
              joueurs.map((j) => j.trim()).filter(Boolean),
              { nom: cNom.trim(), prenom: cPrenom.trim(), tel: cTel.trim() }
            )
          }
        >
          Ajouter
        </button>
      </div>
    </div>
  );
}

function TogglePill({
  checked,
  onChange,
  label,
  tone,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  tone: "paye" | "dark";
}) {
  const on =
    tone === "paye"
      ? "border-paye/50 bg-paye/10 text-[#1E8E3E]"
      : "border-encre bg-nuage text-encre";
  const off = "border-ligne bg-blanc text-ardoise hover:bg-nuage";
  return (
    <label
      className={`inline-flex cursor-pointer select-none items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition ${
        checked ? on : off
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5"
      />
      {label}
    </label>
  );
}

/* ============================================================
 *  Finances (logique inchangée — reskin uniquement)
 * ============================================================ */
function FinancesTab({
  tournoi,
  rentreeInscriptions,
  finances,
  achats,
  setAchats,
  frais,
  setFrais,
  onBuvette,
}: any) {
  const supabase = createClient();

  async function addLigne(
    table: "achats_divers" | "frais_association",
    setter: any,
    liste: LigneFinance[]
  ) {
    const { data } = await supabase
      .from(table)
      .insert({
        tournoi_id: tournoi.id,
        description: "",
        montant: 0,
        position: liste.length + 1,
      })
      .select()
      .single();
    if (data) setter((prev: LigneFinance[]) => [...prev, data]);
  }

  async function updLigne(
    table: "achats_divers" | "frais_association",
    setter: any,
    id: string,
    patch: Partial<LigneFinance>
  ) {
    setter((prev: LigneFinance[]) =>
      prev.map((l) => (l.id === id ? { ...l, ...patch } : l))
    );
    await supabase.from(table).update(patch).eq("id", id);
  }

  async function delLigne(
    table: "achats_divers" | "frais_association",
    setter: any,
    id: string
  ) {
    setter((prev: LigneFinance[]) => prev.filter((l) => l.id !== id));
    await supabase.from(table).delete().eq("id", id);
  }

  return (
    <div className="print-area space-y-5">
      {/* RECETTES */}
      <section className="card p-5">
        <h3 className="display mb-4 text-lg font-semibold text-encre">Recettes</h3>
        <LigneBilan
          label="Rentrée inscriptions"
          hint="joueurs payés × tarif (auto)"
          value={formatEuro(rentreeInscriptions)}
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <label className="label mb-0">Rentrée buvette</label>
          <MoneyInput
            value={Number(tournoi.rentree_buvette)}
            onCommit={(v) => onBuvette("rentree_buvette", v)}
          />
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-brume pt-3">
          <span className="font-medium text-encre">Total recettes</span>
          <span className="display text-lg font-semibold text-encre">
            {formatEuro(finances.totalRecettes)}
          </span>
        </div>
      </section>

      {/* DÉPENSES */}
      <section className="card p-5">
        <h3 className="display mb-4 text-lg font-semibold text-encre">Dépenses</h3>

        <div className="mb-4 flex items-center justify-between gap-3">
          <label className="label mb-0">Dépense buvette</label>
          <MoneyInput
            value={Number(tournoi.depense_buvette)}
            onCommit={(v) => onBuvette("depense_buvette", v)}
          />
        </div>

        <TableauLignes
          titre="Achats divers"
          lignes={achats}
          total={finances.totalAchatsDivers}
          onAdd={() => addLigne("achats_divers", setAchats, achats)}
          onUpd={(id, patch) => updLigne("achats_divers", setAchats, id, patch)}
          onDel={(id) => delLigne("achats_divers", setAchats, id)}
          labelAjout="+ Ajouter une dépense"
        />

        <div className="mt-6">
          <TableauLignes
            titre="Frais association"
            lignes={frais}
            total={finances.totalFraisAssociation}
            onAdd={() => addLigne("frais_association", setFrais, frais)}
            onUpd={(id, patch) => updLigne("frais_association", setFrais, id, patch)}
            onDel={(id) => delLigne("frais_association", setFrais, id)}
            labelAjout="+ Ajouter un frais"
            avecFonction
          />
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-brume pt-3">
          <span className="font-medium text-encre">Total dépenses</span>
          <span className="display text-lg font-semibold text-encre">
            {formatEuro(finances.totalDepenses)}
          </span>
        </div>
      </section>

      {/* BÉNÉFICE */}
      <section className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-ardoise">Bénéfice net du tournoi</div>
            <div className="text-xs text-ardoise/70">Recettes − Dépenses</div>
          </div>
          <div
            className={`display text-3xl font-semibold ${
              finances.beneficeNet >= 0 ? "text-[#1E8E3E]" : "text-nonpaye"
            }`}
          >
            {formatEuro(finances.beneficeNet)}
          </div>
        </div>
      </section>
    </div>
  );
}

function LigneBilan({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-encre">{label}</div>
        {hint && <div className="text-xs text-ardoise/70">{hint}</div>}
      </div>
      <div className="display font-medium text-encre">{value}</div>
    </div>
  );
}

function MoneyInput({
  value,
  onCommit,
}: {
  value: number;
  onCommit: (v: number) => void;
}) {
  const [v, setV] = useState(String(value ?? 0));
  return (
    <div className="relative w-40">
      <input
        type="number"
        step="0.01"
        min="0"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => onCommit(Number(v) || 0)}
        className="input pr-7 text-right"
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ardoise">
        €
      </span>
    </div>
  );
}

function TableauLignes({
  titre,
  lignes,
  total,
  onAdd,
  onUpd,
  onDel,
  labelAjout,
  avecFonction,
}: {
  titre: string;
  lignes: LigneFinance[];
  total: number;
  onAdd: () => void;
  onUpd: (id: string, patch: Partial<LigneFinance>) => void;
  onDel: (id: string) => void;
  labelAjout: string;
  avecFonction?: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-medium uppercase tracking-wide text-ardoise">
          {titre}
        </h4>
        <span className="display font-medium text-encre">{formatEuro(total)}</span>
      </div>
      {lignes.length === 0 && (
        <p className="mb-2 text-sm text-ardoise/70">
          Aucune ligne — ajoutez-en une ci-dessous.
        </p>
      )}
      <div className="space-y-2">
        {lignes.map((l) => (
          <div key={l.id} className="flex flex-wrap items-center gap-2">
            <input
              className="input flex-1"
              placeholder="Description"
              defaultValue={l.description}
              onBlur={(e) => onUpd(l.id, { description: e.target.value })}
            />
            {avecFonction && (
              <input
                className="input flex-1 text-sm"
                placeholder="Fonction (optionnel)"
                defaultValue={l.fonction ?? ""}
                onBlur={(e) => onUpd(l.id, { fonction: e.target.value })}
              />
            )}
            <div className="relative w-28">
              <input
                type="number"
                step="0.01"
                className="input pr-6 text-right"
                defaultValue={l.montant}
                onBlur={(e) => onUpd(l.id, { montant: Number(e.target.value) || 0 })}
              />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-ardoise">
                €
              </span>
            </div>
            <button
              className="no-print px-2 text-nonpaye hover:opacity-70"
              onClick={() => onDel(l.id)}
              aria-label="Supprimer la ligne"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button className="btn-ghost no-print mt-2 text-sm" onClick={onAdd}>
        {labelAjout}
      </button>
    </div>
  );
}
