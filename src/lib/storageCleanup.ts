import { supabase } from "@/integrations/supabase/client"

/**
 * Delete a file from Supabase Storage given its public URL.
 * Silently ignores non-Supabase URLs (Catbox/Cloudinary) and missing files.
 *
 * Used to free space after admin approves/rejects a task submission.
 */
export async function deleteSupabaseStorageFile(publicUrl?: string | null): Promise<void> {
  if (!publicUrl || typeof publicUrl !== "string") return
  try {
    // Match: .../storage/v1/object/public/<bucket>/<path...>
    const m = publicUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?|$)/)
    if (!m) return
    const bucket = m[1]
    const path = decodeURIComponent(m[2])
    await supabase.storage.from(bucket).remove([path])
  } catch (err) {
    // Non-fatal: cleanup is best-effort
    console.warn("[storageCleanup] failed to delete", publicUrl, err)
  }
}

/** Delete multiple URLs in parallel. */
export async function deleteSupabaseStorageFiles(urls: Array<string | null | undefined>): Promise<void> {
  await Promise.all(urls.map(deleteSupabaseStorageFile))
}
