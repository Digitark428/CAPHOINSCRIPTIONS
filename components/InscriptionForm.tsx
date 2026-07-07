"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatEuro } from "@/lib/finance";

interface Props {
  slug: string;
  tarifParJoueur: number;
  placesRestantes?: number | null;
  listeAttente?: boolean;
}

const ENGAGEMENTS = [
  "Je confirme que mon équipe participera au tournoi.",
  "Je certifie que mon équipe sera présente au tournoi. En cas d'annulation, je m'engage à prévenir l'organisation au plus tard la veille avant 21h00. Toute annulation signalée après 21h00 entraînera la mise en liste d'attente de l'équipe pour le tournoi suivant.",
  "Je m'engage à respecter les horaires d'inscription et à arriver à l'heure sur le site du tournoi.",
];

export function InscriptionForm({
  slug,
  tarifParJoueur,
  placesRestantes,
  listeAttente = false,
}: Props) {
  const [nomEquipe, setNomEquipe] = useState("");
  const [contactNom, setContactNom] = useState("");
  const [contactPrenom, setContactPrenom] = useState("");
  const [contactTel, setContactTel] = useState("");
  const [joueurs, setJoueurs] = useState<string[]>(["", "", "", ""]);
  const [cases, setCases] = useState<boolean[]>([false, false, false]);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);

  const nbRemplis = joueurs.filter((j) => j.trim() !== "").length;
  const nomOk = nomEquipe.trim() !== "";
  const contactOk =
    contactNom.trim() !== "" &&
    contactPrenom.trim() !== "" &&
    contactTel.trim() !== "";
  const casesOk = cases.every(Boolean);
  const peutValider =
    nomOk && contactOk && nbRemplis >= 4 && casesOk && !loading;

  function setJoueur(i: number, v: string) {
    setJoueurs((prev) => prev.map((j, idx) => (idx === i ? v : j)));
  }
  function ajouterJoueur() {
    if (joueurs.length < 8) setJoueurs((prev) => [...prev, ""]);
  }
  function retirerJoueur(i: number) {
    if (joueurs.length > 4)
      setJoueurs((prev) => prev.filter((_, idx) => idx !== i));
  }
  function toggleCase(i: number) {
    setCases((prev) => prev.map((c, idx) => (idx === i ? !c : c)));
  }

  async function handleSubmit() {
    setErreur(null);
    if (!peutValider) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("inscrire_equipe", {
      p_slug: slug,
      p_nom_equipe: nomEquipe.trim(),
      p_joueurs: joueurs.map((j) => j.trim()).filter(Boolean),
      p_contact_nom: contactNom.trim(),
      p_contact_prenom: contactPrenom.trim(),
      p_contact_telephone: contactTel.trim(),
      p_liste_attente: listeAttente,
    });
    setLoading(false);
    if (error) {
      setErreur(error.message || "Une erreur est survenue. Réessayez.");
      return;
    }
    setSucces(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (succes) {
    return (
      <div className="card p-8 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-noir">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 13l4 4L19 7"
              stroke="#fff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="display text-2xl font-semibold text-encre">
          {listeAttente ? "Équipe en liste d'attente" : "Équipe inscrite"}
        </h2>
        <p className="mt-2 text-ardoise">
          {listeAttente
            ? `« ${nomEquipe.trim()} » est enregistrée en liste d'attente. Si une place se libère, l'organisation vous contactera dans l'ordre d'inscription.`
            : `« ${nomEquipe.trim()} » est bien enregistrée. Rendez-vous sur le sable.`}
        </p>
        <div className="mx-auto mt-6 max-w-sm rounded-2xl bg-nuage p-5 text-left">
          <div className="flex items-center justify-between">
            <span className="text-sm text-ardoise">
              {listeAttente ? "À régler si une place se libère" : "À régler sur place"}
            </span>
            <span className="display text-lg font-semibold text-encre">
              {formatEuro(nbRemplis * tarifParJoueur)}
            </span>
          </div>
          <p className="mt-1 text-xs text-ardoise">
            {nbRemplis} joueurs × {formatEuro(tarifParJoueur)} · carte bancaire
            ou espèces, le jour du tournoi.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {typeof placesRestantes === "number" && placesRestantes <= 5 && (
        <div className="rounded-2xl border border-ligne bg-nuage px-4 py-3 text-sm font-medium text-encre">
          {placesRestantes === 1
            ? "⚡ Dernière place disponible — dépêchez-vous !"
            : `⚡ Plus que ${placesRestantes} places disponibles pour ce tournoi.`}
        </div>
      )}

      {/* Équipe */}
      <section className="card p-6 sm:p-7">
        <h2 className="display mb-4 text-lg font-semibold text-encre">
          Votre équipe
        </h2>
        <label className="label" htmlFor="nom-equipe">
          Nom de l&apos;équipe <Req />
        </label>
        <input
          id="nom-equipe"
          className="input"
          placeholder="Ex : Les Homards Déchaînés"
          value={nomEquipe}
          onChange={(e) => setNomEquipe(e.target.value)}
          maxLength={80}
        />
      </section>

      {/* Contact référent */}
      <section className="card p-6 sm:p-7">
        <h2 className="display mb-1 text-lg font-semibold text-encre">
          Contact référent
        </h2>
        <p className="mb-4 text-sm text-ardoise">
          Ces informations nous permettent de vous joindre. Elles sont
          obligatoires.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="c-prenom">
              Prénom <Req />
            </label>
            <input
              id="c-prenom"
              className="input"
              autoComplete="given-name"
              value={contactPrenom}
              onChange={(e) => setContactPrenom(e.target.value)}
              maxLength={60}
            />
          </div>
          <div>
            <label className="label" htmlFor="c-nom">
              Nom <Req />
            </label>
            <input
              id="c-nom"
              className="input"
              autoComplete="family-name"
              value={contactNom}
              onChange={(e) => setContactNom(e.target.value)}
              maxLength={60}
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="label" htmlFor="c-tel">
            Numéro de téléphone <Req />
          </label>
          <input
            id="c-tel"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className="input"
            placeholder="0692 00 00 00"
            value={contactTel}
            onChange={(e) => setContactTel(e.target.value)}
            maxLength={30}
          />
        </div>
      </section>

      {/* Joueurs */}
      <section className="card p-6 sm:p-7">
        <h2 className="display mb-1 text-lg font-semibold text-encre">
          Joueurs
        </h2>
        <p className="mb-4 text-sm text-ardoise">
          Minimum 4, maximum 8 joueurs.
        </p>
        <div className="space-y-3">
          {joueurs.map((j, i) => {
            const obligatoire = i < 4;
            return (
              <div key={i}>
                <label className="label" htmlFor={`joueur-${i}`}>
                  Joueur {i + 1}{" "}
                  {obligatoire ? (
                    <Req />
                  ) : (
                    <span className="text-ardoise/60">(optionnel)</span>
                  )}
                </label>
                <div className="flex gap-2">
                  <input
                    id={`joueur-${i}`}
                    className="input"
                    placeholder={`Prénom Nom`}
                    value={j}
                    onChange={(e) => setJoueur(i, e.target.value)}
                    maxLength={80}
                  />
                  {!obligatoire && (
                    <button
                      type="button"
                      onClick={() => retirerJoueur(i)}
                      className="btn-ghost px-3"
                      aria-label={`Retirer le joueur ${i + 1}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {joueurs.length < 8 && (
          <button
            type="button"
            onClick={ajouterJoueur}
            className="btn-ghost mt-4 w-full"
          >
            + Ajouter un joueur ({joueurs.length}/8)
          </button>
        )}
      </section>

      {/* Montant + paiement sur place */}
      <section className="card p-6 sm:p-7">
        <div className="flex items-center justify-between">
          <span className="text-ardoise">Montant de l&apos;inscription</span>
          <span className="display text-2xl font-semibold text-encre">
            {formatEuro(nbRemplis * tarifParJoueur)}
          </span>
        </div>
        <p className="mt-1 text-sm text-ardoise">
          {nbRemplis} joueur{nbRemplis > 1 ? "s" : ""} ×{" "}
          {formatEuro(tarifParJoueur)}
        </p>
        <div className="mt-4 rounded-2xl bg-nuage p-4">
          <p className="text-sm font-medium text-encre">
            Le paiement ne s&apos;effectue pas en ligne.
          </p>
          <p className="mt-1 text-sm text-ardoise">
            Le règlement se fait directement sur place, le jour du tournoi.
            Moyens acceptés : carte bancaire 💳 et espèces 💵.
          </p>
        </div>
      </section>

      {/* Encart d'engagement — très visible (anthracite) */}
      <section className="rounded-2xl bg-anthracite p-6 text-white sm:p-7">
        <p className="display text-base font-semibold">
          ⚠️ Merci de ne pas inscrire de fausses équipes.
        </p>
        <div className="mt-3 space-y-2 text-sm leading-relaxed text-white/80">
          <p>
            En validant cette inscription, vous vous engagez à participer au
            tournoi.
          </p>
          <p>
            Les places étant limitées, toute inscription bloque une place pour
            d&apos;autres joueurs.
          </p>
          <p>
            Merci de respecter l&apos;organisation et de prévenir rapidement en
            cas d&apos;annulation.
          </p>
          <p className="text-white">
            Nous comptons sur votre sérieux et votre fair-play. 🏐
          </p>
        </div>
      </section>

      {/* Horaires */}
      <section className="card p-6 sm:p-7">
        <h2 className="display mb-3 text-lg font-semibold text-encre">
          Le jour du tournoi
        </h2>
        <ul className="space-y-2.5 text-sm text-ardoise">
          <li className="flex gap-3">
            <Puce />
            Les inscriptions sur place se déroulent entre{" "}
            <b className="font-medium text-encre">7h00 et 8h15</b>.
          </li>
          <li className="flex gap-3">
            <Puce />
            Le tournoi débute à{" "}
            <b className="font-medium text-encre">8h30</b>.
          </li>
          <li className="flex gap-3">
            <Puce />
            Toute équipe qui ne sera pas totalement enregistrée à 8h15 sera
            automatiquement scratchée du tournoi.
          </li>
          <li className="flex gap-3">
            <Puce />
            Même présente sur le site, elle devra attendre qu&apos;une place se
            libère pour pouvoir participer.
          </li>
        </ul>
      </section>

      {/* Cases à cocher obligatoires */}
      <section className="card p-6 sm:p-7">
        <h2 className="display mb-4 text-lg font-semibold text-encre">
          Engagements
        </h2>
        <div className="space-y-3">
          {ENGAGEMENTS.map((txt, i) => (
            <label
              key={i}
              className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${
                cases[i]
                  ? "border-encre bg-nuage"
                  : "border-ligne hover:bg-nuage/60"
              }`}
            >
              <input
                type="checkbox"
                checked={cases[i]}
                onChange={() => toggleCase(i)}
                className="mt-0.5 h-5 w-5 shrink-0"
              />
              <span className="text-sm leading-relaxed text-encre">{txt}</span>
            </label>
          ))}
        </div>
      </section>

      {erreur && (
        <p className="rounded-xl border border-nonpaye/30 bg-nonpaye/5 px-4 py-3 text-sm text-nonpaye">
          {erreur}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={!peutValider}
        className="btn-primary w-full py-3.5 text-base"
      >
        {loading
          ? "Envoi en cours…"
          : listeAttente
            ? "S'inscrire en liste d'attente"
            : "Valider l'inscription"}
      </button>
      {!peutValider && !loading && (
        <p className="text-center text-xs text-ardoise">
          {!nomOk
            ? "Renseignez le nom de l'équipe."
            : !contactOk
              ? "Renseignez le contact référent (prénom, nom, téléphone)."
              : nbRemplis < 4
                ? `Ajoutez au moins ${4 - nbRemplis} joueur${
                    4 - nbRemplis > 1 ? "s" : ""
                  } de plus.`
                : "Cochez les trois engagements pour valider."}
        </p>
      )}
    </div>
  );
}

function Req() {
  return <span className="text-nonpaye">*</span>;
}

function Puce() {
  return (
    <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-encre" />
  );
}
