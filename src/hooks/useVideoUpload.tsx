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
      // Step 1: Get signed upload params from edge function
      setUploadProgress(prev => ({ ...prev, progress: 20 }))
      
      const { data: signData, error: signError } = await supabase.functions.invoke('upload-video', {
        body: { userId: user.id, folder }
      })

      if (signError) throw signError
      if (!signData?.success) throw new Error(signData?.error || 'Failed to get upload signature')

      const { uploadParams } = signData

      // Step 2: Upload directly to Cloudinary from the client (no base64, no body size limit)
      setUploadProgress(prev => ({ ...prev, progress: 30 }))

      const formData = new FormData()
      formData.append('file', file)
      formData.append('api_key', uploadParams.apiKey)
      formData.append('timestamp', uploadParams.timestamp.toString())
      formData.append('signature', uploadParams.signature)
      formData.append('folder', uploadParams.folder)
      formData.append('public_id', uploadParams.publicId)
      formData.append('resource_type', 'video')
      formData.append('eager', uploadParams.eager)

      const xhr = new XMLHttpRequest()
      
      const uploadResult = await new Promise<any>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const pct = Math.round(30 + (e.loaded / e.total) * 60)
            setUploadProgress(prev => ({ ...prev, progress: pct }))
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText))
          } else {
            try {
              const err = JSON.parse(xhr.responseText)
              reject(new Error(err.error?.message || 'Upload failed'))
            } catch {
              reject(new Error('Upload failed'))
            }
          }
        })

        xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')))

        xhr.open('POST', `https://api.cloudinary.com/v1_1/${uploadParams.cloudName}/video/upload`)
        xhr.send(formData)
      })

      setUploadProgress(prev => ({ ...prev, progress: 95 }))

      // Generate thumbnail URL from the uploaded video
      const thumbnailUrl = uploadResult.secure_url.replace(
        '/video/upload/', 
        '/video/upload/w_320,h_240,c_limit/'
      )

      setUploadProgress(prev => ({ ...prev, progress: 100 }))

      toast({
        title: "Video uploaded",
        description: "Your video has been uploaded successfully"
      })

      return {
        videoUrl: uploadResult.secure_url,
        thumbnailUrl,
        duration: uploadResult.duration
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
