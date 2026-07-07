"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Brand } from "@/components/Brand";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      setErreur("Identifiants incorrects.");
      return;
    }
    router.push(redirect);
    router.refresh();
  }

  return (
    <div className="card p-7">
      <h1 className="display mb-1 text-2xl font-semibold text-encre">
        Espace organisateur
      </h1>
      <p className="mb-6 text-sm text-ardoise">
        Connectez-vous pour gérer vos tournois.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {erreur && (
          <p className="rounded-xl border border-nonpaye/30 bg-nonpaye/5 px-4 py-2.5 text-sm text-nonpaye">
            {erreur}
          </p>
        )}
        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="mb-8 flex justify-center">
        <Link href="/">
          <Brand />
        </Link>
      </div>
      <Suspense
        fallback={
          <div className="card p-7 text-center text-ardoise">Chargement…</div>
        }
      >
        <LoginForm />
      </Suspense>
      <p className="mt-4 text-center text-xs text-ardoise">
        Les comptes organisateurs se créent dans le tableau de bord Supabase
        (Authentication → Users).
      </p>
    </main>
  );
}
