"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const CONFIRM_SUPPRESSION =
  "Êtes-vous sûr de vouloir supprimer ce tournoi ? Cette action est irréversible.";

/**
 * Menu d'actions d'un tournoi : archiver / désarchiver / supprimer.
 * Utilisé sur la liste des tournois et dans l'historique.
 * `variant="inline"` rend des boutons pleins (en-tête de tableau de bord) ;
 * sinon un menu discret « … » superposable sur une carte-lien.
 */
export function TournoiActions({
  id,
  isHistorique,
  variant = "menu",
  redirectTo,
}: {
  id: string;
  isHistorique: boolean;
  variant?: "menu" | "inline";
  redirectTo?: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function setArchive(value: boolean) {
    setBusy(true);
    await supabase
      .from("tournois")
      .update({ is_historique: value })
      .eq("id", id);
    setBusy(false);
    setOpen(false);
    router.refresh();
  }

  async function supprimer() {
    if (!confirm(CONFIRM_SUPPRESSION)) return;
    setBusy(true);
    await supabase.from("tournois").delete().eq("id", id);
    setBusy(false);
    setOpen(false);
    if (redirectTo) {
      router.push(redirectTo);
      router.refresh();
    } else {
      router.refresh();
    }
  }

  if (variant === "inline") {
    return (
      <>
        <button
          className="btn-ghost"
          disabled={busy}
          onClick={() => setArchive(!isHistorique)}
        >
          {isHistorique ? "Désarchiver" : "Archiver"}
        </button>
        <button
          className="btn-ghost text-nonpaye"
          disabled={busy}
          onClick={supprimer}
        >
          Supprimer
        </button>
      </>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        aria-label="Actions du tournoi"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-brume bg-blanc/90 text-encre backdrop-blur transition hover:bg-nuage"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
          <circle cx="4" cy="10" r="1.6" />
          <circle cx="10" cy="10" r="1.6" />
          <circle cx="16" cy="10" r="1.6" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute right-0 top-9 z-40 w-44 overflow-hidden rounded-xl border border-brume bg-blanc py-1 shadow-flotte"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <button
            className="block w-full px-4 py-2.5 text-left text-sm text-encre transition hover:bg-nuage"
            disabled={busy}
            onClick={() => setArchive(!isHistorique)}
          >
            {isHistorique ? "Désarchiver" : "Archiver"}
          </button>
          <button
            className="block w-full px-4 py-2.5 text-left text-sm text-nonpaye transition hover:bg-nonpaye/5"
            disabled={busy}
            onClick={supprimer}
          >
            Supprimer
          </button>
        </div>
      )}
    </div>
  );
}
