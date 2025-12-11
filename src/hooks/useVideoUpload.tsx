import { useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

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

export const useVideoUpload = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    isUploading: false,
    progress: 0
  })

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }

  const uploadVideo = useCallback(async (file: File, folder: string = 'feed'): Promise<VideoUploadResult | null> => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to upload videos",
        variant: "destructive"
      })
      return null
    }

    // Check file size (max 100MB)
    const maxSize = 100 * 1024 * 1024
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Video must be less than 100MB",
        variant: "destructive"
      })
      return null
    }

    // Check file type
    if (!file.type.startsWith('video/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a video file",
        variant: "destructive"
      })
      return null
    }

    setUploadProgress({
      isUploading: true,
      progress: 10,
      fileName: file.name
    })

    try {
      // Convert file to base64
      setUploadProgress(prev => ({ ...prev, progress: 30 }))
      const base64 = await fileToBase64(file)

      setUploadProgress(prev => ({ ...prev, progress: 50 }))

      // Upload via edge function
      const { data, error } = await supabase.functions.invoke('upload-video', {
        body: {
          videoBase64: base64,
          userId: user.id,
          folder
        }
      })

      if (error) throw error

      if (!data.success) {
        throw new Error(data.error || 'Upload failed')
      }

      setUploadProgress(prev => ({ ...prev, progress: 100 }))

      toast({
        title: "Video uploaded",
        description: "Your video has been uploaded successfully"
      })

      return {
        videoUrl: data.videoUrl,
        thumbnailUrl: data.thumbnailUrl,
        duration: data.duration
      }

    } catch (error: any) {
      console.error('[Video Upload] Error:', error)
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload video",
        variant: "destructive"
      })
      return null
    } finally {
      setUploadProgress({
        isUploading: false,
        progress: 0
      })
    }
  }, [user, toast])

  return {
    uploadVideo,
    uploadProgress
  }
}
