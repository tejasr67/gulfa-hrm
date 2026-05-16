import "server-only";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "employee-documents";
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export function buildStoragePath(companyId: string, employeeId: string, fileName: string): string {
  // sanitize filename, prefix with timestamp to avoid collisions
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${companyId}/${employeeId}/${Date.now()}_${safe}`;
}

export async function createSignedUploadUrl(storagePath: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(storagePath);
  if (error) throw new Error(`Storage upload URL error: ${error.message}`);
  return data; // { signedUrl, token, path }
}

export async function createSignedDownloadUrl(storagePath: string, expiresIn = 900): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, expiresIn);
  if (error) throw new Error(`Storage download URL error: ${error.message}`);
  return data.signedUrl;
}

export async function deleteStorageFile(storagePath: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (error) throw new Error(`Storage delete error: ${error.message}`);
}
