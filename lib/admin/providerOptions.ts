import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export interface ProviderOption {
  id: string;
  name: string;
  handle: string | null;
}

export async function listProviderOptions(): Promise<ProviderOption[]> {
  const admin = createSupabaseServiceRoleClient();
  const { data, error } = await admin
    .from("providers")
    .select("id, name, handle")
    .order("name", { ascending: true })
    .limit(500);

  if (error) {
    console.warn("[providerOptions] providers:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name ?? "Comercio sin nombre"),
    handle: (row.handle as string | null) ?? null,
  }));
}
