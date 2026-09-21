import "server-only";

import { adminFetch } from "@/lib/admin/adminFetch";
import type { UploadKind } from "@/lib/admin/uploads";

export interface AdminUploadTicket {
  bucket: string;
  path: string;
  /** One-shot token, valid for this path only. */
  token: string;
  signedUrl: string;
  /** Where the file will be readable once the upload finishes. */
  publicUrl: string;
  contentType: string;
}

export function createUploadTicket(input: {
  kind: UploadKind;
  filename: string;
  contentType: string;
  sizeBytes: number;
}) {
  return adminFetch<AdminUploadTicket>("/admin/uploads/ticket", {
    method: "POST",
    body: input,
  });
}

export function deleteUpload(kind: UploadKind, path: string) {
  return adminFetch<{ ok: true }>("/admin/uploads", {
    method: "DELETE",
    body: { kind, path },
  });
}
