import React, { useState } from 'react'
import { X, Upload, Camera, Video } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BrandButton } from '@/components/ui/brand-button'
import { BrandInput } from '@/components/ui/brand-input'

interface CreateStoryDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreateStory: (mediaUrl: string, mediaType: string, content?: string) => Promise<{ success?: boolean; error?: string }>
}

const CreateStoryDialog: React.FC<CreateStoryDialogProps> = ({ 
  isOpen, 
  onClose, 
  onCreateStory 
}) => {
  const [content, setContent] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!mediaUrl.trim()) {
      alert('Please provide a media URL')
      return
    }

    setSubmitting(true)

    const result = await onCreateStory(mediaUrl.trim(), mediaType, content.trim())
    
    if (result?.success) {
      setContent('')
      setMediaUrl('')
      setMediaType('image')
      onClose()
    }

    setSubmitting(false)
  }

  const handleClose = () => {
    if (!submitting) {
      setContent('')
      setMediaUrl('')
      setMediaType('image')
      onClose()
    }
  }

  const storyTypes = [
    { type: 'image', label: 'Photo Story', icon: Camera, description: 'Share a photo with your network' },
    { type: 'video', label: 'Video Story', icon: Video, description: 'Record a quick tip or update' }
  ]

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-xl font-bold">Create Professional Story</DialogTitle>
          <button onClick={handleClose} className="p-2 hover:bg-accent rounded-full">
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Story Type Selection */}
          <div className="space-y-3">
            <h3 className="font-semibold text-text-primary">Story Type</h3>
            <div className="grid grid-cols-2 gap-3">
              {storyTypes.map((type) => (
                <button
                  key={type.type}
                  type="button"
                  onClick={() => setMediaType(type.type as 'image' | 'video')}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    mediaType === type.type
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <type.icon className={`h-6 w-6 mb-2 ${
                    mediaType === type.type ? 'text-primary' : 'text-text-secondary'
                  }`} />
                  <div className="font-medium text-sm">{type.label}</div>
                  <div className="text-xs text-text-secondary mt-1">{type.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Media URL Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              Media URL
            </label>
            <BrandInput
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder={`Paste your ${mediaType} URL here...`}
              required
            />
            <p className="text-xs text-text-secondary">
              Upload your {mediaType} to a hosting service and paste the URL here
            </p>
          </div>

          {/* Content Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              Caption (Optional)
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Add a caption to your story..."
              className="flex min-h-[80px] w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              maxLength={200}
            />
            <p className="text-xs text-text-secondary text-right">
              {content.length}/200 characters
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3">
            <BrandButton 
              type="button" 
              variant="outline" 
              className="flex-1"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </BrandButton>
            <BrandButton 
              type="submit" 
              className="flex-1"
              disabled={submitting || !mediaUrl.trim()}
            >
              {submitting ? 'Creating...' : 'Share Story'}
            </BrandButton>
          </div>
        </form>

        <div className="text-xs text-text-secondary text-center pt-4 border-t border-border">
          Stories are visible for 24 hours and help showcase your professional work
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CreateStoryDialog