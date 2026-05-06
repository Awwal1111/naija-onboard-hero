import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { uploadToCatbox } from '@/lib/catbox'
import { useToast } from './use-toast'

export interface UploadProgress {
  progress: number
  isUploading: boolean
  error: string | null
}

/**
 * EGRESS PROTECTION: All public media now routes to Catbox.moe (free, unlimited
 * bandwidth) by default to prevent Supabase cached_egress quota violations.
 *
 * Buckets that MUST stay on Supabase (private/sensitive only):
 *  - identity-documents, kyc, verification (KYC files)
 *  - escrow-evidence, dispute-evidence (legal proof)
 *  - private-attachments (chat/secure docs requiring RLS)
 *
 * Everything else (avatars, posts, stories, gigs, articles, portfolio, tasks,
 * job applications) goes to Catbox.
 */
const PRIVATE_BUCKETS = new Set<string>([
  'identity-documents',
  'kyc',
  'verification',
  'verification-documents',
  'escrow-evidence',
  'dispute-evidence',
  'private-attachments',
  'secure-files',
])

const shouldUseSupabase = (bucket: string) => PRIVATE_BUCKETS.has(bucket)

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
    options?: { upsert?: boolean; forceSupabase?: boolean }
  ): Promise<{ url: string | null; error: string | null }> => {
    setUploadProgress({ progress: 0, isUploading: true, error: null })

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        const error = 'Please log in to upload files'
        setUploadProgress({ progress: 0, isUploading: false, error })
        toast({ title: 'Authentication Required', description: error, variant: 'destructive' })
        return { url: null, error }
      }

      // Route 1: Public media → Catbox (free unlimited bandwidth)
      const useCatbox = !options?.forceSupabase && !shouldUseSupabase(bucket)
      const isImageOrVideo = file.type.startsWith('image/') || file.type.startsWith('video/')

      if (useCatbox && isImageOrVideo) {
        const result = await uploadToCatbox(file)
        if (result.error || !result.url) {
          // Fallback to Supabase only if Catbox fails
          console.warn('[useFileUpload] Catbox failed, falling back to Supabase:', result.error)
        } else {
          setUploadProgress({ progress: 100, isUploading: false, error: null })
          toast({ title: 'Success', description: 'File uploaded successfully' })
          return { url: result.url, error: null }
        }
      }

      // Route 2: Private/sensitive files OR non-media → Supabase Storage
      const maxSize = bucket === 'stories' || bucket === 'training-files'
        ? 100 * 1024 * 1024
        : 50 * 1024 * 1024
      if (file.size > maxSize) {
        const error = `File size exceeds ${maxSize / (1024 * 1024)}MB limit`
        setUploadProgress({ progress: 0, isUploading: false, error })
        return { url: null, error }
      }

      const fileExt = file.name.split('.').pop()
      const fileName = path || `${Date.now()}.${fileExt}`
      const filePath = `${session.user.id}/${fileName}`

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          upsert: options?.upsert || false,
          contentType: file.type
        })

      if (error) {
        setUploadProgress({ progress: 0, isUploading: false, error: error.message })
        toast({ title: 'Upload Failed', description: error.message, variant: 'destructive' })
        return { url: null, error: error.message }
      }

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path)
      setUploadProgress({ progress: 100, isUploading: false, error: null })
      toast({ title: 'Success', description: 'File uploaded successfully' })
      return { url: publicUrl, error: null }
    } catch (error: any) {
      const errorMessage = error.message || 'Upload failed'
      setUploadProgress({ progress: 0, isUploading: false, error: errorMessage })
      toast({ title: 'Upload Failed', description: errorMessage, variant: 'destructive' })
      return { url: null, error: errorMessage }
    }
  }

  const deleteFile = async (bucket: string, filePath: string) => {
    // Catbox URLs cannot be deleted via API; only delete Supabase-hosted files
    if (filePath.startsWith('https://files.catbox.moe/')) {
      return { success: true }
    }
    try {
      const { error } = await supabase.storage.from(bucket).remove([filePath])
      if (error) throw error
      toast({ title: 'Success', description: 'File deleted successfully' })
      return { success: true }
    } catch (error: any) {
      toast({ title: 'Delete Failed', description: error.message, variant: 'destructive' })
      return { success: false, error: error.message }
    }
  }

  return { uploadFile, deleteFile, uploadProgress }
}
