import { useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { uploadToCatbox } from '@/lib/catbox'

interface UploadProgress {
  isUploading: boolean
  progress: number
  fileName?: string
}

interface VideoUploadResult {
  videoUrl: string
  thumbnailUrl: string
  duration?: number
}

/**
 * Video uploader — routes directly to Catbox (free, unlimited bandwidth, 200MB cap).
 * Cloudinary path was removed after the Cloudinary free quota was exceeded.
 */
export const useVideoUpload = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    isUploading: false,
    progress: 0,
  })

  const uploadVideo = useCallback(
    async (file: File, _folder: string = 'feed'): Promise<VideoUploadResult | null> => {
      if (!user) {
        toast({ title: 'Error', description: 'You must be logged in to upload videos', variant: 'destructive' })
        return null
      }
      if (!file.type.startsWith('video/')) {
        toast({ title: 'Invalid file type', description: 'Please upload a video file', variant: 'destructive' })
        return null
      }
      // Catbox caps individual files at 200MB
      const maxSize = 200 * 1024 * 1024
      if (file.size > maxSize) {
        toast({ title: 'File too large', description: 'Video must be less than 200MB', variant: 'destructive' })
        return null
      }

      setUploadProgress({ isUploading: true, progress: 30, fileName: file.name })

      try {
        const result = await uploadToCatbox(file, { compress: false })
        if (result.error || !result.url) {
          throw new Error(result.error || 'Upload failed')
        }
        setUploadProgress({ isUploading: true, progress: 100, fileName: file.name })
        toast({ title: 'Video uploaded', description: 'Your video has been uploaded successfully' })
        return {
          videoUrl: result.url,
          // Catbox doesn't generate thumbnails — UI falls back to the video poster frame
          thumbnailUrl: result.url,
        }
      } catch (error: any) {
        console.error('[Video Upload] Error:', error)
        toast({
          title: 'Upload failed',
          description: error?.message || 'Failed to upload video',
          variant: 'destructive',
        })
        return null
      } finally {
        setUploadProgress({ isUploading: false, progress: 0 })
      }
    },
    [user, toast],
  )

  return { uploadVideo, uploadProgress }
}
