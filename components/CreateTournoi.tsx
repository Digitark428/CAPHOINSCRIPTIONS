"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/slug";
import { uploadAffiche } from "@/lib/upload";
import { LIBELLE_TYPE, type TypeTournoi } from "@/lib/types";

const TYPES: TypeTournoi[] = ["4x4", "3x3", "mixte", "beach_camp", "autre"];

export function CreateTournoi() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nom, setNom] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouche, setSlugTouche] = useState(false);
  const [type, setType] = useState<TypeTournoi>("4x4");
  const [date, setDate] = useState("");
  const [tarif, setTarif] = useState("10");
  const [places, setPlaces] = useState("");
  const [affiche, setAffiche] = useState<File | null>(null);
  const [apercu, setApercu] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const slugFinal = slugTouche ? slug : slugify(nom);

  function choisirImage(f: File | null) {
    setAffiche(f);
    setApercu(f ? URL.createObjectURL(f) : null);
  }

  async function creer() {
    setErreur(null);
    if (!nom.trim() || !slugFinal) {
      setErreur("Le nom du tournoi est obligatoire.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("tournois")
      .insert({
        nom: nom.trim(),
        slug: slugFinal,
        type,
        date_tournoi: date || null,
        tarif_par_joueur: Number(tarif) || 10,
        max_equipes: places.trim() ? Math.max(1, parseInt(places, 10)) : null,
        statut: "ouvert",
        is_historique: false,
      })
      .select("id")
      .single();

    if (error || !data) {
      setLoading(false);
      setErreur(
        error?.code === "23505"
          ? "Ce lien (slug) est déjà utilisé, choisissez-en un autre."
          : error?.message ?? "Erreur lors de la création."
      );
      return;
    }

    // Affiche (optionnelle)
    if (affiche) {
      try {
        const url = await uploadAffiche(supabase, data.id, affiche);
        await supabase.from("tournois").update({ image_url: url }).eq("id", data.id);
      } catch {
        // Le tournoi est créé ; l'affiche pourra être ajoutée depuis le tableau de bord.
      }
    }

    // Aucun frais / achat pré-rempli : les tableaux démarrent vides.

    setLoading(false);
    setOpen(false);
    router.push(`/admin/tournoi/${data.id}`);
    router.refresh();
  }

  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}>
        + Nouveau tournoi
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="card max-h-[92vh] w-full max-w-lg overflow-y-auto p-6 shadow-flotte sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="display mb-5 text-xl font-semibold text-encre">
              Nouveau tournoi
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label">Nom du tournoi</label>
                <input
                  className="input"
                  placeholder="Ex : Fourman du 19 juillet"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                />
              </div>

              {/* Affiche */}
              <div>
                <label className="label">Affiche du tournoi (optionnel)</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => choisirImage(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full items-center gap-4 rounded-xl border border-dashed border-ligne bg-nuage/60 p-3 text-left transition hover:bg-nuage"
                >
                  {apercu ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={apercu}
                      alt="Aperçu de l'affiche"
                      className="h-16 w-16 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-blanc text-ardoise">
                      +
                    </span>
                  )}
                  <span className="text-sm text-ardoise">
                    {affiche ? affiche.name : "Choisir une image (JPG, PNG…)"}
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Format</label>
                  <select
                    className="input"
                    value={type}
                    onChange={(e) => setType(e.target.value as TypeTournoi)}
                  >
                    {TYPES.map((t) => (
                      <option key={t} value={t}>
                        {LIBELLE_TYPE[t]}
                      </option>
                    ))}
                  </select>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Tarif / joueur (€)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    className="input"
                    value={tarif}
                    onChange={(e) => setTarif(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Places (équipes)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    className="input"
                    placeholder="Illimité"
                    value={places}
                    onChange={(e) => setPlaces(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="label">Lien d&apos;inscription</label>
                <input
                  className="input"
                  value={slugFinal}
                  onChange={(e) => {
                    setSlugTouche(true);
                    setSlug(slugify(e.target.value));
                  }}
                />
              </div>
              <p className="text-xs text-ardoise">
                Places : laissez vide pour un nombre d&apos;équipes illimité. URL
                publique :{" "}
                <span className="text-encre">/tournoi/{slugFinal || "…"}</span>
              </p>
              {erreur && (
                <p className="rounded-xl border border-nonpaye/30 bg-nonpaye/5 px-4 py-2.5 text-sm text-nonpaye">
                  {erreur}
                </p>
              )}
            </div>
            <div className="mt-6 flex gap-3">
              <button className="btn-ghost flex-1" onClick={() => setOpen(false)}>
                Annuler
              </button>
              <button
                className="btn-primary flex-1"
                onClick={creer}
                disabled={loading}
              >
                {loading ? "Création…" : "Créer le tournoi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
