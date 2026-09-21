import "server-only";

import { listProviderOptionsApi, type ProviderOption } from "@/lib/admin/providersApi";

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
