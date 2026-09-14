import { createClient } from "@supabase/supabase-js";

const CHECKS: Record<string, string[]> = {
  events: [
    "id", "provider_id", "title", "description", "starts_at", "ends_at",
    "city", "venue", "address", "latitude", "longitude", "capacity",
    "status", "event_type", "ticket_mode", "theme_color", "cover_image_url",
    "refund_policy", "refund_partial_pct", "refund_deadline_days",
  ],
  provider_event_ticket_types: [
    "id", "provider_id", "event_id", "name", "kind", "price", "total",
    "active", "sort_order", "sale_starts_at", "sale_ends_at",
  ],
  event_media: ["event_id", "url", "sort_order"],
  event_interests: ["event_id", "interest_id"],
  interests: ["id", "name", "slug"],
  event_questions: ["id", "event_id", "label", "kind", "options", "required", "sort_order"],
  provider_activity_log: ["provider_id", "type", "message", "meta"],
};

async function main() {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  for (const [table, columns] of Object.entries(CHECKS)) {
    const missing: string[] = [];
    let tableMissing = false;
    for (const col of columns) {
      const { error } = await db.from(table).select(col).limit(1);
      if (!error) continue;
      if (/relation .* does not exist|Could not find the table/i.test(error.message)) {
        tableMissing = true;
        break;
      }
      missing.push(col);
    }
    if (tableMissing) console.log(`${table}: TABLA NO EXISTE`);
    else if (missing.length) console.log(`${table}: faltan -> ${missing.join(", ")}`);
    else console.log(`${table}: ok`);
  }
}
void main();
