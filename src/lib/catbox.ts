/**
 * Public media upload pipeline (egress protection):
 *   1. Compress images client-side (browser-image-compression)
 *   2. Upload to Catbox.moe (free, unlimited bandwidth, 200MB/file)
 *
 * Note: Cloudinary fallback was removed after the free quota was exceeded.
 * Catbox is the single provider for all public images/videos.
 */

import imageCompression from 'browser-image-compression'

export interface CatboxUploadResponse {
  url: string
  error?: string
  provider?: 'catbox'
}

const CATBOX_TIMEOUT_MS = 20_000

const COMPRESSION_DEFAULTS = {
  maxSizeMB: 0.6,
  maxWidthOrHeight: 1600,
  useWebWorker: true,
  initialQuality: 0.82,
}

/** Client-side image compression. No-op for non-images or already-tiny files. */
export async function compressImage(file: File, opts?: Partial<typeof COMPRESSION_DEFAULTS>): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  if (file.type === 'image/gif') return file
  if (file.size <= 200 * 1024) return file
  try {
    const compressed = await imageCompression(file, { ...COMPRESSION_DEFAULTS, ...opts })
    return compressed as File
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

/**
 * Upload an image or video to Catbox.
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

    const fileToUpload = isImage && options.compress !== false
      ? await compressImage(file)
      : file

    const url = await uploadToCatboxRaw(fileToUpload)
    return { url, provider: 'catbox' }
  } catch (error) {
    console.error('[upload] Catbox upload failed:', error)
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
