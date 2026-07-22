import { createClient } from "@/lib/supabase/server";
import { VigilanceManager } from "@/components/VigilanceManager";
import type { VigilanceRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function VigilancePage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("liste_vigilance")
    .select("*")
    .order("actif", { ascending: false })
    .order("nom", { ascending: true });

  return (
    <div>
      <div className="mb-6">
        <h1 className="display-tight text-3xl font-semibold text-encre">
          Liste de vigilance
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ardoise">
          Les personnes actives de cette liste sont contrôlées automatiquement à
          chaque inscription. Si un joueur correspond (comparaison insensible aux
          accents et aux majuscules), l&apos;équipe est placée en liste
          d&apos;attente et ne prend pas de place officielle.
        </p>
      </div>

      <VigilanceManager initial={(data ?? []) as VigilanceRow[]} />
    </div>
  );
}
