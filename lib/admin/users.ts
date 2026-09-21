import { getAdminUser, listAdminUsers } from "@/lib/admin/usersApi";
import { unstable_cache } from "next/cache";
import { cache } from "react";

export type {
  AdminUserRecord,
  AppRole,
  ProviderStatus,
  UserStatus,
} from "@/lib/admin/usersApi";

import type { AdminUserRecord } from "@/lib/admin/usersApi";

export async function getUserById(
  userId: string,
): Promise<AdminUserRecord | null> {
  try {
    return await getAdminUser(userId);
  } catch {
    return null;
  }
}

async function fetchAllUsersUncached(): Promise<AdminUserRecord[]> {
  const { items } = await listAdminUsers();
  return items;
}

// Cross-request cache: 30s stale-while-revalidate. Listing auth users is
// ~300-500ms and is used on 4+ pages (overview, providers, users, payments).
// Without caching every navigation pays that cost, even though the user table
// rarely changes. Mutations revalidate via `revalidateTag("admin-users")`.
const cachedFetchAllUsers = unstable_cache(
  fetchAllUsersUncached,
  ["admin-users-v1"],
  { revalidate: 30, tags: ["admin-users"] },
);

// Per-request dedupe (React cache) + cross-request ISR cache.
export const listAllUsers = cache(async (): Promise<AdminUserRecord[]> => {
  return cachedFetchAllUsers();
});
