/**
 * Catbox.moe API Integration
 * Free, anonymous file hosting service
 * No API key required, supports images and videos up to 200MB
 */

export interface CatboxUploadResponse {
  url: string
  error?: string
}

/**
 * Upload a file to Catbox.moe
 * @param file - The file to upload (image or video)
 * @returns Promise with the hosted file URL
 */
export async function uploadToCatbox(file: File): Promise<CatboxUploadResponse> {
  try {
    // Validate file size (200MB limit)
    const maxSize = 200 * 1024 * 1024 // 200MB in bytes
    if (file.size > maxSize) {
      return {
        url: '',
        error: 'File size exceeds 200MB limit'
      }
    }

    // Validate file type (images and videos only)
    const validTypes = ['image/', 'video/']
    const isValidType = validTypes.some(type => file.type.startsWith(type))
    
    if (!isValidType) {
      return {
        url: '',
        error: 'Only images and videos are supported'
      }
    }

    // Create form data for Catbox API
    const formData = new FormData()
    formData.append('reqtype', 'fileupload')
    formData.append('fileToUpload', file)

    console.log('Uploading to Catbox.moe:', {
      fileName: file.name,
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      fileType: file.type
    })

    // Upload to Catbox
    const response = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`)
    }

    // Response is plain text with the URL
    const url = await response.text()
    
    // Validate response
    if (!url || !url.startsWith('https://files.catbox.moe/')) {
      throw new Error('Invalid response from Catbox')
    }

    console.log('Successfully uploaded to Catbox:', url)

    return { url }
  } catch (error) {
    console.error('Catbox upload error:', error)
    return {
      url: '',
      error: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

/**
 * Get file type category from MIME type
 */
export function getFileCategory(mimeType: string): 'image' | 'video' | 'other' {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  return 'other'
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
