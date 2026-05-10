"use server";

import { isRootEmail } from "@/lib/role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  isValidAdminEventStatus,
  updateAdminEventStatus,
} from "./eventsApi";

async function requireRoot() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isRootEmail(user.email)) {
    throw new Error("No autorizado");
  }
}

export async function setEventStatus(formData: FormData) {
  await requireRoot();
  const id = String(formData.get("eventId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!id) throw new Error("eventId requerido");
  if (!isValidAdminEventStatus(status)) {
    throw new Error(`status inválido: ${status}`);
  }

  await updateAdminEventStatus(id, status);
  revalidatePath("/events");
}
