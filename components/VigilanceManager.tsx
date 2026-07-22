"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { VigilanceRow } from "@/lib/types";

const aujourdhui = () => new Date().toISOString().slice(0, 10);

export function VigilanceManager({ initial }: { initial: VigilanceRow[] }) {
  const supabase = createClient();
  const [liste, setListe] = useState<VigilanceRow[]>(initial);
  const [q, setQ] = useState("");

  // Formulaire d'ajout
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [motif, setMotif] = useState("");
  const [date, setDate] = useState(aujourdhui());
  const [ajoutEnCours, setAjoutEnCours] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texte: string } | null>(null);

  const filtree = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return liste;
    return liste.filter((v) =>
      `${v.prenom} ${v.nom} ${v.motif}`.toLowerCase().includes(s)
    );
  }, [liste, q]);

  const nbActifs = liste.filter((v) => v.actif).length;
  const peutAjouter =
    prenom.trim() !== "" && nom.trim() !== "" && !ajoutEnCours;

  async function ajouter() {
    if (!peutAjouter) return;
    setAjoutEnCours(true);
    setMsg(null);
    const { data, error } = await supabase
      .from("liste_vigilance")
      .insert({
        prenom: prenom.trim(),
        nom: nom.trim(),
        motif: motif.trim(),
        date_signalement: date || aujourdhui(),
        actif: true,
      })
      .select()
      .single();
    setAjoutEnCours(false);
    if (error || !data) {
      setMsg({ ok: false, texte: "Ajout impossible : " + (error?.message ?? "") });
      return;
    }
    setListe((prev) => [data as VigilanceRow, ...prev]);
    setPrenom("");
    setNom("");
    setMotif("");
    setDate(aujourdhui());
    setMsg({ ok: true, texte: "Personne ajoutée à la liste de vigilance." });
    setTimeout(() => setMsg(null), 4000);
  }

  async function supprimer(id: string) {
    if (
      !confirm(
        "Retirer définitivement cette personne de la liste de vigilance ?"
      )
    )
      return;
    const { error } = await supabase
      .from("liste_vigilance")
      .delete()
      .eq("id", id);
    if (error) {
      alert("Suppression impossible : " + error.message);
      return;
    }
    setListe((prev) => prev.filter((v) => v.id !== id));
  }

  function remplacer(maj: VigilanceRow) {
    setListe((prev) => prev.map((v) => (v.id === maj.id ? maj : v)));
  }

  return (
    <div className="space-y-6">
      {/* Ajout */}
      <section className="card p-5">
        <h2 className="display mb-4 text-lg font-semibold text-encre">
          Ajouter une personne
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Prénom *</label>
            <input
              className="input"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Nom *</label>
            <input
              className="input"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="label">Motif</label>
            <input
              className="input"
              placeholder="Ex : absence non signalée au tournoi du 19/07"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Date</label>
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
        {msg && (
          <p
            className={`mt-3 rounded-xl px-4 py-2.5 text-sm ${
              msg.ok
                ? "border border-paye/30 bg-paye/10 text-[#1E8E3E]"
                : "border border-nonpaye/30 bg-nonpaye/5 text-nonpaye"
            }`}
          >
            {msg.ok ? "✓ " : "✕ "}
            {msg.texte}
          </p>
        )}
        <button
          className="btn-primary mt-4"
          onClick={ajouter}
          disabled={!peutAjouter}
        >
          {ajoutEnCours ? "Ajout…" : "Ajouter à la liste"}
        </button>
      </section>

      {/* Liste */}
      <section>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h2 className="display text-lg font-semibold text-encre">
              Personnes suivies
            </h2>
            <span className="chip bg-nuage text-encre">
              {nbActifs} active{nbActifs > 1 ? "s" : ""} / {liste.length}
            </span>
          </div>
          <input
            className="input sm:max-w-xs"
            placeholder="Rechercher un nom, un motif…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {filtree.length === 0 ? (
          <div className="card p-10 text-center text-ardoise">
            {liste.length === 0
              ? "La liste de vigilance est vide."
              : "Aucun résultat pour cette recherche."}
          </div>
        ) : (
          <div className="space-y-2">
            {filtree.map((v) => (
              <FicheVigilance
                key={v.id}
                v={v}
                onMaj={remplacer}
                onSupprimer={() => supprimer(v.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* Une fiche : modification en brouillon + enregistrement explicite. */
function FicheVigilance({
  v,
  onMaj,
  onSupprimer,
}: {
  v: VigilanceRow;
  onMaj: (maj: VigilanceRow) => void;
  onSupprimer: () => void;
}) {
  const supabase = createClient();
  const [ouvert, setOuvert] = useState(false);
  const [prenom, setPrenom] = useState(v.prenom);
  const [nom, setNom] = useState(v.nom);
  const [motif, setMotif] = useState(v.motif ?? "");
  const [date, setDate] = useState(v.date_signalement ?? aujourdhui());
  const [actif, setActif] = useState(v.actif);
  const [enCours, setEnCours] = useState(false);
  const [succes, setSucces] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const modifie =
    prenom.trim() !== v.prenom ||
    nom.trim() !== v.nom ||
    motif.trim() !== (v.motif ?? "") ||
    date !== v.date_signalement ||
    actif !== v.actif;

  async function enregistrer() {
    if (prenom.trim() === "" || nom.trim() === "") {
      setErreur("Le prénom et le nom sont obligatoires.");
      return;
    }
    setEnCours(true);
    setErreur(null);
    setSucces(false);
    const patch = {
      prenom: prenom.trim(),
      nom: nom.trim(),
      motif: motif.trim(),
      date_signalement: date || aujourdhui(),
      actif,
    };
    const { error } = await supabase
      .from("liste_vigilance")
      .update(patch)
      .eq("id", v.id);
    if (error) {
      setEnCours(false);
      setErreur(error.message);
      return;
    }
    // Vérification : on relit la fiche en base
    const { data, error: err2 } = await supabase
      .from("liste_vigilance")
      .select("*")
      .eq("id", v.id)
      .single();
    setEnCours(false);
    if (err2 || !data) {
      setErreur("Enregistré mais vérification impossible. Rechargez la page.");
      return;
    }
    const f = data as VigilanceRow;
    const ok =
      f.prenom === patch.prenom &&
      f.nom === patch.nom &&
      (f.motif ?? "") === patch.motif &&
      f.actif === patch.actif;
    if (!ok) {
      setErreur("Les données enregistrées ne correspondent pas. Réessayez.");
      return;
    }
    onMaj(f);
    setSucces(true);
    setTimeout(() => setSucces(false), 4000);
  }

  return (
    <div className={`card overflow-hidden ${modifie ? "ring-1 ring-encre" : ""}`}>
      <button
        onClick={() => setOuvert((o) => !o)}
        className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-nuage"
      >
        <span
          className="h-9 w-1 shrink-0 rounded-full"
          style={{ background: v.actif ? "#FF9F0A" : "#D2D2D7" }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-encre">
              {v.prenom} {v.nom}
            </span>
            <span
              className={`chip ${
                v.actif
                  ? "bg-partiel/15 text-[#B26A00]"
                  : "bg-nuage text-ardoise"
              }`}
            >
              {v.actif ? "Active" : "Désactivée"}
            </span>
            {modifie && (
              <span className="chip bg-anthracite text-white">
                Non enregistré
              </span>
            )}
          </div>
          <div className="truncate text-xs text-ardoise">
            {v.motif || "Sans motif"} ·{" "}
            {v.date_signalement
              ? new Date(v.date_signalement).toLocaleDateString("fr-FR")
              : "—"}
          </div>
        </div>
        <span className="text-ardoise">{ouvert ? "▲" : "▼"}</span>
      </button>

      {ouvert && (
        <div className="border-t border-brume p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Prénom</label>
              <input
                className="input"
                value={prenom}
                onChange={(e) => {
                  setSucces(false);
                  setPrenom(e.target.value);
                }}
              />
            </div>
            <div>
              <label className="label">Nom</label>
              <input
                className="input"
                value={nom}
                onChange={(e) => {
                  setSucces(false);
                  setNom(e.target.value);
                }}
              />
            </div>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="label">Motif</label>
              <input
                className="input"
                value={motif}
                onChange={(e) => {
                  setSucces(false);
                  setMotif(e.target.value);
                }}
              />
            </div>
            <div>
              <label className="label">Date</label>
              <input
                type="date"
                className="input"
                value={date}
                onChange={(e) => {
                  setSucces(false);
                  setDate(e.target.value);
                }}
              />
            </div>
          </div>

          <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl border border-ligne p-3">
            <input
              type="checkbox"
              checked={actif}
              onChange={(e) => {
                setSucces(false);
                setActif(e.target.checked);
              }}
              className="h-5 w-5"
            />
            <span className="text-sm text-encre">
              Fiche active — contrôlée à chaque inscription
            </span>
          </label>

          {erreur && (
            <p className="mt-3 rounded-xl border border-nonpaye/30 bg-nonpaye/5 px-4 py-2.5 text-sm text-nonpaye">
              ✕ {erreur}
            </p>
          )}
          {succes && (
            <p className="mt-3 rounded-xl border border-paye/30 bg-paye/10 px-4 py-2.5 text-sm text-[#1E8E3E]">
              ✓ Fiche enregistrée et vérifiée en base.
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              className="btn-primary"
              onClick={enregistrer}
              disabled={enCours || !modifie}
            >
              {enCours ? "Enregistrement…" : "Enregistrer les modifications"}
            </button>
            {modifie && !enCours && (
              <button
                className="btn-ghost"
                onClick={() => {
                  setPrenom(v.prenom);
                  setNom(v.nom);
                  setMotif(v.motif ?? "");
                  setDate(v.date_signalement);
                  setActif(v.actif);
                  setErreur(null);
                }}
              >
                Annuler
              </button>
            )}
            <div className="flex-1" />
            <button
              className="text-sm text-nonpaye hover:underline"
              onClick={onSupprimer}
            >
              Supprimer la fiche
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
