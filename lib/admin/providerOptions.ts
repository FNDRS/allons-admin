import "server-only";

import { listProviderOptionsApi } from "@/lib/admin/providersApi";
import type { ProviderOption } from "@/lib/admin/providerTypes";

export type { ProviderOption };

export async function listProviderOptions(): Promise<ProviderOption[]> {
  try {
    const { items } = await listProviderOptionsApi();
    return items;
  } catch (error) {
    console.warn("[providerOptions] providers:", error);
    return [];
  }
}
