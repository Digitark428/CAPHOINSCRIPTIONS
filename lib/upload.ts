"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

export const BUCKET_AFFICHES = "tournoi-images";

/** Nettoie un nom de fichier pour en faire une clé de stockage sûre. */
function safeName(name: string): string {
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase() : "jpg";
  return `${Date.now()}.${ext.replace(/[^a-z0-9]/g, "") || "jpg"}`;
}

/**
 * Envoie une affiche dans le bucket public et renvoie son URL publique.
 * Lève une erreur explicite en cas d'échec (ex. bucket absent).
 */
export async function uploadAffiche(
  supabase: SupabaseClient,
  tournoiId: string,
  file: File
): Promise<string> {
  const path = `${tournoiId}/${safeName(file.name)}`;
  const { error } = await supabase.storage
    .from(BUCKET_AFFICHES)
    .upload(path, file, { upsert: true, cacheControl: "3600" });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET_AFFICHES).getPublicUrl(path);
  return data.publicUrl;
}
