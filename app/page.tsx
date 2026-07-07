import Link from "next/link";
import { Brand, Logo } from "@/components/Brand";

export default function Home() {
  return (
    <main className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-8">
        <Logo size={64} />
      </div>
      <p className="eyebrow mb-4">Beach Volley · La Réunion 974</p>
      <h1 className="display-tight text-5xl font-semibold leading-[1.03] text-encre sm:text-6xl">
        CAP HOMARD
      </h1>
      <p className="mt-3 display text-xl font-medium text-ardoise sm:text-2xl">
        Gestion des tournois
      </p>
      <p className="mt-6 max-w-md text-[17px] leading-relaxed text-ardoise">
        Inscriptions en ligne, suivi des paiements et bilans financiers de nos
        tournois — réunis au même endroit.
      </p>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link href="/inscription" className="btn-pill bg-noir text-blanc hover:bg-encre">
          S&apos;inscrire à un tournoi
        </Link>
        <Link
          href="/login"
          className="btn-pill border border-ligne bg-blanc text-encre hover:bg-nuage"
        >
          Espace organisateur
        </Link>
      </div>

      <footer className="absolute bottom-6 text-xs text-ardoise">
        <Brand compact />
      </footer>
    </main>
  );
}
