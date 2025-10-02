import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from './use-toast'

export interface UploadProgress {
  progress: number
  isUploading: boolean
  error: string | null
}

export const useFileUpload = () => {
  const { toast } = useToast()
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    progress: 0,
    isUploading: false,
    error: null
  })

  const uploadFile = async (
    file: File,
    bucket: string,
    path?: string,
    options?: { upsert?: boolean }
  ): Promise<{ url: string | null; error: string | null }> => {
    setUploadProgress({ progress: 0, isUploading: true, error: null })

    try {
      // Check authentication first
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        const error = 'Please log in to upload files'
        setUploadProgress({ progress: 0, isUploading: false, error })
        toast({
          title: "Authentication Required",
          description: error,
          variant: "destructive"
        })
        return { url: null, error }
      }

      // Validate file size (50MB limit for most buckets, 100MB for stories/training)
      const maxSize = bucket === 'stories' || bucket === 'training-files' ? 100 * 1024 * 1024 : 50 * 1024 * 1024
      if (file.size > maxSize) {
        const error = `File size exceeds ${maxSize / (1024 * 1024)}MB limit`
        setUploadProgress({ progress: 0, isUploading: false, error })
        return { url: null, error }
      }

      // Create file path with user ID
      const fileExt = file.name.split('.').pop()
      const fileName = path || `${Date.now()}.${fileExt}`
      const filePath = `${session.user.id}/${fileName}`

      // Upload file
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          upsert: options?.upsert || false,
          contentType: file.type
        })

      if (error) {
        setUploadProgress({ progress: 0, isUploading: false, error: error.message })
        toast({
          title: "Upload Failed",
          description: error.message,
          variant: "destructive"
        })
        return { url: null, error: error.message }
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path)

      setUploadProgress({ progress: 100, isUploading: false, error: null })
      
      toast({
        title: "Success",
        description: "File uploaded successfully"
      })

      return { url: publicUrl, error: null }
    } catch (error: any) {
      const errorMessage = error.message || 'Upload failed'
      setUploadProgress({ progress: 0, isUploading: false, error: errorMessage })
      
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive"
      })

      return { url: null, error: errorMessage }
    }
  }

  const deleteFile = async (bucket: string, filePath: string) => {
    try {
      const { error } = await supabase.storage.from(bucket).remove([filePath])
      if (error) throw error

      toast({
        title: "Success",
        description: "File deleted successfully"
      })

      return { success: true }
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive"
      })
      return { success: false, error: error.message }
    }
  }

  return {
    uploadFile,
    deleteFile,
    uploadProgress
  }
}