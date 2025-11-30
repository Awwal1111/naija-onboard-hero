import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BrandButton } from '@/components/ui/brand-button'
import { BrandInput } from '@/components/ui/brand-input'
import { Camera, Video, X, FileText, Music } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { uploadToCatbox, formatFileSize } from '@/lib/catbox'
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
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio' | 'document' | 'text'>('text')
  const [storyType, setStoryType] = useState<'text' | 'media'>('text')
  const [backgroundColor, setBackgroundColor] = useState('gradient-primary')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const { toast } = useToast()

  // Facebook/Instagram style background options
  const backgroundOptions = [
    { id: 'gradient-primary', name: 'Green', class: 'bg-gradient-to-br from-primary to-brand-green' },
    { id: 'gradient-purple', name: 'Purple', class: 'bg-gradient-to-br from-purple-500 to-pink-500' },
    { id: 'gradient-blue', name: 'Blue', class: 'bg-gradient-to-br from-blue-500 to-cyan-500' },
    { id: 'gradient-orange', name: 'Orange', class: 'bg-gradient-to-br from-orange-500 to-red-500' },
    { id: 'solid-black', name: 'Black', class: 'bg-black' },
  ]

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
    setStoryType('media')
    
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
    setStoryType('text')
  }

  const handleSubmit = async () => {
    // Allow text-only stories like Facebook/Instagram
    if (!mediaFile && !content.trim()) {
      toast({
        title: "Content required",
        description: "Please add text or upload media for your story",
        variant: "destructive"
      })
      return
    }

    try {
      const { data: user } = await supabase.auth.getUser()
      
      if (!user.user) {
        throw new Error('User not authenticated')
      }

      let mediaUrl = null

      // Upload media if provided (using Catbox.moe for images/videos)
      if (mediaFile) {
        // Check if it's an image or video
        const isImageOrVideo = mediaFile.type.startsWith('image/') || mediaFile.type.startsWith('video/')
        
        if (isImageOrVideo) {
          // Upload to Catbox.moe (free hosting)
          setUploading(true)
          setUploadProgress(50) // Show progress
          
          const { url, error } = await uploadToCatbox(mediaFile)
          
          setUploadProgress(100)
          setUploading(false)
          
          if (error || !url) {
            throw new Error(error || 'Upload to Catbox failed')
          }
          
          mediaUrl = url
          
          toast({
            title: "Uploaded successfully",
            description: "Your media is hosted on Catbox.moe"
          })
        } else {
          // For other file types, show error (stories should only be images/videos)
          throw new Error('Only images and videos are supported for stories')
        }
      }

      // Create story record (expires in 24 hours like Instagram/Facebook)
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 24)
      
      const { error: storyError } = await supabase
        .from('stories')
        .insert({
          user_id: user.user.id,
          content: content.trim() || null,
          media_url: mediaUrl,
          media_type: storyType === 'text' ? 'text' : mediaType,
          background_color: storyType === 'text' ? backgroundColor : null,
          expires_at: expiresAt.toISOString()
        })

      if (storyError) throw storyError

      toast({
        title: "Success",
        description: "Your story has been posted!"
      })

      // Reset form
      setContent('')
      removeMedia()
      setStoryType('text')
      setBackgroundColor('gradient-primary')
      setUploadProgress(0)
      onStoryCreated()
      onClose()
    } catch (error: any) {
      console.error('Error creating story:', error)
      setUploading(false)
      setUploadProgress(0)
      toast({
        title: "Error",
        description: error.message || "Failed to create story",
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
          <DialogTitle>Create Story</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Story Type Toggle */}
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setStoryType('text')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                storyType === 'text' 
                  ? 'bg-primary text-white' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Text Story
            </button>
            <button
              onClick={() => setStoryType('media')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                storyType === 'media' 
                  ? 'bg-primary text-white' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Media Story
            </button>
          </div>

          {/* Text Story Content */}
          {storyType === 'text' && (
            <>
              <div>
                <label className="text-sm font-medium text-text-primary mb-2 block">
                  What's on your mind?
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Share something..."
                  maxLength={280}
                  className="w-full min-h-[120px] p-3 rounded-lg border border-border bg-background text-text-primary resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-text-secondary mt-1">{content.length}/280</p>
              </div>

              {/* Background Color Selection */}
              <div>
                <label className="text-sm font-medium text-text-primary mb-2 block">
                  Background Style
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {backgroundOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setBackgroundColor(option.id)}
                      className={`h-12 rounded-lg ${option.class} border-2 transition-all ${
                        backgroundColor === option.id 
                          ? 'border-primary scale-105' 
                          : 'border-transparent'
                      }`}
                      title={option.name}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              {content && (
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className={`h-48 ${backgroundOptions.find(o => o.id === backgroundColor)?.class} flex items-center justify-center p-6`}>
                    <p className="text-white text-lg font-medium text-center line-clamp-4">
                      {content}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Media Upload Options */}
          {storyType === 'media' && (
          <div className="space-y-3">
            <label className="text-sm font-medium text-text-primary mb-2 block">
              Add media to your story
            </label>
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
            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading to Catbox.moe...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <BrandButton 
              variant="outline" 
              className="flex-1"
              onClick={onClose}
              disabled={uploading}
            >
              Cancel
            </BrandButton>
            <BrandButton 
              className="flex-1"
              onClick={handleSubmit}
              disabled={
                uploading || 
                (storyType === 'text' ? !content.trim() : !mediaFile)
              }
            >
              {uploading ? 'Uploading...' : 'Post Story'}
            </BrandButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CreateStoryDialog