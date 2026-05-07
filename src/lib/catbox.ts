/**
 * Public media upload pipeline (egress protection):
 *   1. Compress images client-side (browser-image-compression)
 *   2. Upload to Catbox.moe (free, primary)
 *   3. If Catbox is down/unreachable, fall back to Cloudinary (signed)
 *
 * Videos skip compression and go straight to Catbox (Cloudinary handled
 * separately in useVideoUpload).
 */

import imageCompression from 'browser-image-compression'
import { supabase } from '@/integrations/supabase/client'

export interface CatboxUploadResponse {
  url: string
  error?: string
  provider?: 'catbox' | 'cloudinary'
}

const CATBOX_TIMEOUT_MS = 20_000

const COMPRESSION_DEFAULTS = {
  maxSizeMB: 0.6,           // ~600 KB cap for typical photos
  maxWidthOrHeight: 1600,   // plenty for retina display
  useWebWorker: true,
  initialQuality: 0.82,
}

/** Client-side image compression. No-op for non-images or already-tiny files. */
export async function compressImage(file: File, opts?: Partial<typeof COMPRESSION_DEFAULTS>): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  if (file.type === 'image/gif') return file // preserve animation
  if (file.size <= 200 * 1024) return file   // already small
  try {
    const compressed: Blob = await imageCompression(file, { ...COMPRESSION_DEFAULTS, ...opts })
    return compressed instanceof File
      ? compressed
      : new File([compressed], file.name, { type: (compressed as Blob).type || file.type })
  } catch (e) {
    console.warn('[upload] compression failed, using original', e)
    return file
  }
}

async function uploadToCatboxRaw(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('reqtype', 'fileupload')
  formData.append('fileToUpload', file)

  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), CATBOX_TIMEOUT_MS)
  try {
    const response = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: formData,
      signal: ctrl.signal,
    })
    if (!response.ok) throw new Error(`Catbox HTTP ${response.status}`)
    const url = (await response.text()).trim()
    if (!url.startsWith('https://files.catbox.moe/')) throw new Error('Invalid Catbox response')
    return url
  } finally {
    clearTimeout(t)
  }
}

async function uploadToCloudinaryFallback(file: File, folder: string): Promise<string> {
  const { data: signData, error: signError } = await supabase.functions.invoke('upload-image-cloudinary', {
    body: { folder },
  })
  if (signError) throw signError
  if (!signData?.success) throw new Error(signData?.error || 'Failed to sign Cloudinary upload')
  const p = signData.uploadParams

  const fd = new FormData()
  fd.append('file', file)
  fd.append('api_key', p.apiKey)
  fd.append('timestamp', String(p.timestamp))
  fd.append('signature', p.signature)
  fd.append('folder', p.folder)
  fd.append('public_id', p.publicId)
  fd.append('eager', p.eager)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${p.cloudName}/image/upload`, {
    method: 'POST',
    body: fd,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || !json.secure_url) throw new Error(json?.error?.message || 'Cloudinary upload failed')
  return json.secure_url as string
}

/**
 * Upload an image or video to Catbox, with image compression + Cloudinary fallback.
 */
export async function uploadToCatbox(
  file: File,
  options: { compress?: boolean; folder?: string } = {},
): Promise<CatboxUploadResponse> {
  try {
    const maxSize = 200 * 1024 * 1024
    if (file.size > maxSize) return { url: '', error: 'File size exceeds 200MB limit' }

    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')
    if (!isImage && !isVideo) return { url: '', error: 'Only images and videos are supported' }

    // 1. Compress images (skipped for video)
    const fileToUpload = isImage && options.compress !== false
      ? await compressImage(file)
      : file

    // 2. Catbox primary
    try {
      const url = await uploadToCatboxRaw(fileToUpload)
      return { url, provider: 'catbox' }
    } catch (catboxErr) {
      console.warn('[upload] Catbox failed, trying Cloudinary fallback:', catboxErr)
      // 3. Cloudinary fallback (images only — videos use useVideoUpload directly)
      if (!isImage) throw catboxErr
      const url = await uploadToCloudinaryFallback(fileToUpload, options.folder || 'fallback')
      return { url, provider: 'cloudinary' }
    }
  } catch (error) {
    console.error('[upload] Both providers failed:', error)
    return { url: '', error: error instanceof Error ? error.message : 'Upload failed' }
  }
}

/** Get file type category from MIME type */
export function getFileCategory(mimeType: string): 'image' | 'video' | 'other' {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  return 'other'
}

/** Format file size for display */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
