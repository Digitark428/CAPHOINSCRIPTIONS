import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TournoiDashboard } from "@/components/TournoiDashboard";
import type { EquipeRow, LigneFinance, Tournoi } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PageTournoi({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: tournoi } = await supabase
    .from("tournois")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!tournoi) notFound();

  const [{ data: equipes }, { data: achats }, { data: frais }] =
    await Promise.all([
      supabase
        .from("equipes")
        .select("*, joueurs(*)")
        .eq("tournoi_id", params.id)
        .order("created_at")
        .order("position", { foreignTable: "joueurs" }),
      supabase
        .from("achats_divers")
        .select("*")
        .eq("tournoi_id", params.id)
        .order("position"),
      supabase
        .from("frais_association")
        .select("*")
        .eq("tournoi_id", params.id)
        .order("position"),
    ]);

  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const baseUrl = host ? `${proto}://${host}` : "";

  // trier les joueurs par position
  const equipesTri = (equipes ?? []).map((e: any) => ({
    ...e,
    joueurs: (e.joueurs ?? []).sort(
      (a: any, b: any) => (a.position ?? 0) - (b.position ?? 0)
    ),
  }));

  return (
    <TournoiDashboard
      tournoi={tournoi as Tournoi}
      equipesInit={equipesTri as EquipeRow[]}
      achatsInit={(achats ?? []) as LigneFinance[]}
      fraisInit={(frais ?? []) as LigneFinance[]}
      baseUrl={baseUrl}
    />
  );
}
