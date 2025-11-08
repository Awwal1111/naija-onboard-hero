import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { useToast } from './use-toast'
import { 
  validateFile, 
  ALLOWED_IMAGE_TYPES, 
  ALLOWED_DOCUMENT_TYPES, 
  MAX_FILE_SIZE, 
  MAX_IMAGE_SIZE 
} from '@/lib/security'

interface UploadProgress {
  progress: number
  isUploading: boolean
  error: string | null
}

export const useSecureFileUpload = () => {
  const { user } = useAuth()
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
    fileType: 'image' | 'document' = 'image'
  ): Promise<{ url: string | null; error: string | null }> => {
    // Check auth without triggering logout
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      toast({
        title: "Authentication required",
        description: "Please login to upload files",
        variant: "destructive"
      })
      return { url: null, error: 'User not authenticated' }
    }

    const currentUser = session.user

    // Check rate limit first
    try {
      const { data: rateLimitOk, error: rateLimitError } = await supabase
        .rpc('check_rate_limit', {
          action_name: 'file_upload',
          max_requests: 20, // Max 20 uploads per hour
          window_minutes: 60
        })

      if (rateLimitError) {
        console.error('Rate limit check failed:', rateLimitError)
      } else if (!rateLimitOk) {
        toast({
          title: "Upload limit exceeded",
          description: "You've reached your upload limit for this hour. Please try again later.",
          variant: "destructive"
        })
        return { url: null, error: 'Rate limit exceeded' }
      }
    } catch (error) {
      console.error('Rate limit check failed:', error)
      // Continue with upload if rate limit check fails
    }

    // Validate file
    const allowedTypes = fileType === 'image' ? ALLOWED_IMAGE_TYPES : ALLOWED_DOCUMENT_TYPES
    const maxSize = fileType === 'image' ? MAX_IMAGE_SIZE : MAX_FILE_SIZE
    
    const validation = validateFile(file, allowedTypes, maxSize)
    if (!validation.isValid) {
      const error = validation.errors.join(', ')
      toast({
        title: "File validation failed",
        description: error,
        variant: "destructive"
      })
      return { url: null, error }
    }

    setUploadProgress({ progress: 0, isUploading: true, error: null })

    try {
      // Generate secure file path
      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(2, 15)
      const fileExtension = file.name.split('.').pop()
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      
      const filePath = path || `${currentUser.id}/${timestamp}_${random}_${sanitizedFileName}`

      // Create a new file with sanitized name if needed
      let fileToUpload = file
      if (file.name !== sanitizedFileName) {
        fileToUpload = new File([file], sanitizedFileName, { type: file.type })
      }

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, fileToUpload, {
          cacheControl: '3600',
          upsert: false,
          metadata: {
            uploadedBy: currentUser.id,
            originalName: file.name,
            uploadedAt: new Date().toISOString(),
            fileType: fileType
          }
        })

      if (error) {
        console.error('Upload error:', error)
        setUploadProgress({ progress: 0, isUploading: false, error: error.message })
        toast({
          title: "Upload failed",
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
      
      // Don't show generic toast - let the calling component handle feedback
      console.log('✅ File uploaded successfully:', publicUrl)

      return { url: publicUrl, error: null }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      console.error('Upload error:', error)
      setUploadProgress({ progress: 0, isUploading: false, error: errorMessage })
      
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive"
      })
      
      return { url: null, error: errorMessage }
    }
  }

  const deleteFile = async (bucket: string, filePath: string): Promise<boolean> => {
    if (!user) return false

    try {
      // Check if user owns the file by checking if the path starts with their user ID
      if (!filePath.startsWith(user.id)) {
        toast({
          title: "Access denied",
          description: "You can only delete your own files",
          variant: "destructive"
        })
        return false
      }

      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath])

      if (error) {
        console.error('Delete error:', error)
        toast({
          title: "Delete failed",
          description: error.message,
          variant: "destructive"
        })
        return false
      }

      toast({
        title: "File deleted",
        description: "File deleted successfully",
        variant: "default"
      })
      
      return true

    } catch (error) {
      console.error('Delete error:', error)
      toast({
        title: "Delete failed",
        description: "Failed to delete file",
        variant: "destructive"
      })
      return false
    }
  }

  return {
    uploadFile,
    deleteFile,
    uploadProgress
  }
}