"use client";

import { useState } from "react";
import Link from "next/link";
import { InscriptionForm } from "@/components/InscriptionForm";

/**
 * Affiché quand un tournoi est complet : on voit qu'il est plein, l'inscription
 * normale est impossible, mais un bouton permet de s'inscrire en LISTE D'ATTENTE
 * (même formulaire que l'inscription classique).
 */
export function ListeAttente({
  slug,
  tarifParJoueur,
  maxEquipes,
}: {
  slug: string;
  tarifParJoueur: number;
  maxEquipes: number | null;
}) {
  const [ouvert, setOuvert] = useState(false);

  if (ouvert) {
    return (
      <div>
        <div className="mb-5 rounded-2xl bg-anthracite p-5 text-white">
          <p className="display text-base font-semibold">
            Inscription en liste d&apos;attente
          </p>
          <p className="mt-1 text-sm text-white/80">
            Le tournoi est complet. Votre équipe sera ajoutée à la liste
            d&apos;attente : si une place se libère, l&apos;organisation vous
            contactera dans l&apos;ordre d&apos;inscription. Le règlement ne se
            fera que si vous obtenez une place.
          </p>
        </div>
        <InscriptionForm
          slug={slug}
          tarifParJoueur={tarifParJoueur}
          listeAttente
        />
      </div>
    );
  }

  return (
    <div className="card p-10 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-anthracite text-white">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M18 6 6 18M6 6l12 12"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <h2 className="display text-xl font-semibold text-encre">
        Tournoi complet
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-ardoise">
        Toutes les places{maxEquipes ? ` (${maxEquipes} équipes)` : ""} sont
        prises. L&apos;inscription n&apos;est plus possible, mais vous pouvez
        rejoindre la liste d&apos;attente.
      </p>
      <button className="btn-primary mt-6" onClick={() => setOuvert(true)}>
        S&apos;inscrire en liste d&apos;attente
      </button>
      <div className="mt-3">
        <Link href="/inscription" className="text-sm text-ardoise hover:text-encre">
          Voir les autres tournois
        </Link>
      </div>
    </div>
  );
}
