/**
 * FILE ENGINE
 * Handle file uploads and attachments.
 * Supports photos, documents, and jobsite reports.
 * Files can attach to jobs, journal entries, or employees.
 */

import { supabase } from "@/lib/supabase";

export type FileRefType = "job" | "journal" | "employee" | "crew" | "delivery";

export type FileCategory = "photo" | "document" | "report" | "voice_memo" | "other";

export interface FileRecord {
  id: string;
  ref_type: FileRefType;
  ref_id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  category: FileCategory;
  uploaded_by: string | null;
  created_at: string;
}

// ── Upload helpers ────────────────────────────────────────────────────────────

/**
 * Upload a file to Supabase Storage and record it in naf_attachments.
 * Falls back gracefully if storage is unavailable.
 */
export async function uploadFile(
  file: File,
  refType: FileRefType,
  refId: string,
  uploadedBy?: string
): Promise<FileRecord | null> {
  if (!supabase) return null;

  const bucket = "jobsite-files";
  const path = `${refType}/${refId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file);
  if (uploadError) {
    console.error("[FileEngine] Upload error:", uploadError.message);
    return null;
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);

  // Record in naf_attachments for NAF feed compatibility
  const category = detectCategory(file.type);
  const { data, error } = await supabase
    .from("naf_attachments")
    .insert({
      file_name: file.name,
      file_url: urlData.publicUrl,
      file_size: file.size,
      mime_type: file.type,
      file_type: category,
    })
    .select()
    .single();

  if (error) {
    console.error("[FileEngine] DB record error:", error.message);
    return null;
  }

  return {
    id: data.id,
    ref_type: refType,
    ref_id: refId,
    file_name: file.name,
    file_url: urlData.publicUrl,
    file_size: file.size,
    mime_type: file.type,
    category,
    uploaded_by: uploadedBy ?? null,
    created_at: data.created_at,
  };
}

/** Determine file category from MIME type */
function detectCategory(mimeType: string): FileCategory {
  if (mimeType.startsWith("image/")) return "photo";
  if (mimeType.startsWith("audio/")) return "voice_memo";
  if (mimeType === "application/pdf") return "document";
  if (mimeType.includes("word") || mimeType.includes("sheet") || mimeType.includes("presentation")) return "document";
  return "other";
}

/** Get max file size in bytes (10 MB default) */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Validate a file before upload */
export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `File exceeds 10 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB)` };
  }
  const allowed = [
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf",
    "audio/mpeg", "audio/wav", "audio/webm",
    "video/mp4", "video/webm",
  ];
  if (!allowed.includes(file.type)) {
    return { valid: false, error: `File type '${file.type}' is not supported` };
  }
  return { valid: true };
}
