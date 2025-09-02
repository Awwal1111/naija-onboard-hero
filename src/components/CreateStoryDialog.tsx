import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BrandButton } from '@/components/ui/brand-button'
import { BrandInput } from '@/components/ui/brand-input'
import { Camera, Video, X, FileText, Music } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useFileUpload } from '@/hooks/useFileUpload'
import { supabase } from '@/integrations/supabase/client'

interface CreateStoryDialogProps {
  isOpen: boolean
  onClose: () => void
  onStoryCreated: () => void
}

const CreateStoryDialog: React.FC<CreateStoryDialogProps> = ({
  isOpen,
  onClose,
  onStoryCreated
}) => {
  const [content, setContent] = useState('')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio' | 'document'>('image')
  const { toast } = useToast()
  const { uploadFile, uploadProgress } = useFileUpload()

  const handleMediaUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Determine file type
    let type: 'image' | 'video' | 'audio' | 'document' = 'document'
    if (file.type.startsWith('image/')) type = 'image'
    else if (file.type.startsWith('video/')) type = 'video'
    else if (file.type.startsWith('audio/')) type = 'audio'

    setMediaFile(file)
    setMediaType(type)
    
    // Create preview URL for images and videos
    if (type === 'image' || type === 'video') {
      const previewUrl = URL.createObjectURL(file)
      setMediaPreview(previewUrl)
    } else {
      setMediaPreview(null)
    }
  }

  const removeMedia = () => {
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview)
    }
    setMediaFile(null)
    setMediaPreview(null)
  }

  const handleSubmit = async () => {
    if (!mediaFile) {
      toast({
        title: "Media required",
        description: "Please upload a file for your professional highlight",
        variant: "destructive"
      })
      return
    }

    try {
      const { data: user } = await supabase.auth.getUser()
      
      if (!user.user) {
        throw new Error('User not authenticated')
      }

      // Upload file
      const fileExt = mediaFile.name.split('.').pop()
      const fileName = `story-${Date.now()}.${fileExt}`
      
      const { url, error } = await uploadFile(mediaFile, 'stories', fileName)
      
      if (error || !url) {
        throw new Error(error || 'Upload failed')
      }

      // Create story record
      const { error: storyError } = await supabase
        .from('stories')
        .insert({
          user_id: user.user.id,
          content: content.trim(),
          media_url: url,
          media_type: mediaType
        })

      if (storyError) throw storyError

      toast({
        title: "Success",
        description: "Your professional highlight has been posted!"
      })

      // Reset form
      setContent('')
      removeMedia()
      onStoryCreated()
      onClose()
    } catch (error: any) {
      console.error('Error creating story:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to create highlight",
        variant: "destructive"
      })
    }
  }

  const getFileIcon = () => {
    switch (mediaType) {
      case 'audio': return <Music className="h-8 w-8" />
      case 'document': return <FileText className="h-8 w-8" />
      default: return <FileText className="h-8 w-8" />
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Professional Highlight</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Media Upload Options */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleMediaUpload}
                  className="hidden"
                />
                <BrandButton 
                  type="button" 
                  variant="outline" 
                  className="w-full flex items-center gap-2"
                  size="sm"
                >
                  <Camera className="h-4 w-4" />
                  Photo
                </BrandButton>
              </label>
              
              <label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleMediaUpload}
                  className="hidden"
                />
                <BrandButton 
                  type="button" 
                  variant="outline" 
                  className="w-full flex items-center gap-2"
                  size="sm"
                >
                  <Video className="h-4 w-4" />
                  Video
                </BrandButton>
              </label>

              <label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleMediaUpload}
                  className="hidden"
                />
                <BrandButton 
                  type="button" 
                  variant="outline" 
                  className="w-full flex items-center gap-2"
                  size="sm"
                >
                  <Music className="h-4 w-4" />
                  Audio
                </BrandButton>
              </label>

              <label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleMediaUpload}
                  className="hidden"
                />
                <BrandButton 
                  type="button" 
                  variant="outline" 
                  className="w-full flex items-center gap-2"
                  size="sm"
                >
                  <FileText className="h-4 w-4" />
                  Document
                </BrandButton>
              </label>
            </div>

            {/* Media Preview */}
            {mediaFile && (
              <div className="relative rounded-lg overflow-hidden border border-border">
                {mediaType === 'image' && mediaPreview ? (
                  <img 
                    src={mediaPreview} 
                    alt="Story preview" 
                    className="w-full h-48 object-cover"
                  />
                ) : mediaType === 'video' && mediaPreview ? (
                  <video 
                    src={mediaPreview} 
                    className="w-full h-48 object-cover"
                    controls
                  />
                ) : (
                  <div className="w-full h-24 bg-muted flex items-center justify-center gap-3">
                    {getFileIcon()}
                    <div className="text-sm">
                      <p className="font-medium text-text-primary">{mediaFile.name}</p>
                      <p className="text-text-secondary">{(mediaFile.size / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                  </div>
                )}
                <button
                  onClick={removeMedia}
                  className="absolute top-2 right-2 p-1 bg-background/80 rounded-full hover:bg-background"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Upload Progress */}
            {uploadProgress.isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress.progress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Caption */}
          <BrandInput
            label="Caption (optional)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share what you're working on..."
            maxLength={280}
          />

          {/* Actions */}
          <div className="flex gap-3">
            <BrandButton 
              variant="outline" 
              className="flex-1"
              onClick={onClose}
              disabled={uploadProgress.isUploading}
            >
              Cancel
            </BrandButton>
            <BrandButton 
              className="flex-1"
              onClick={handleSubmit}
              disabled={uploadProgress.isUploading || !mediaFile}
            >
              {uploadProgress.isUploading ? 'Posting...' : 'Post Highlight'}
            </BrandButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CreateStoryDialog