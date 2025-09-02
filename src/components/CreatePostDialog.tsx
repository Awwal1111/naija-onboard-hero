import React, { useState } from 'react'
import { Image, FileText, Briefcase, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BrandButton } from '@/components/ui/brand-button'
import { SecureInput } from '@/components/ui/secure-input'
import { SecureTextarea } from '@/components/ui/secure-textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { sanitizeText } from '@/lib/security'

interface CreatePostDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreatePost: (content: string, contentType: string, title?: string) => Promise<{ success?: boolean; error?: string }>
  userProfile?: {
    full_name: string
    profile_picture_url?: string
  }
}

const CreatePostDialog: React.FC<CreatePostDialogProps> = ({
  isOpen,
  onClose,
  onCreatePost,
  userProfile
}) => {
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [contentType, setContentType] = useState('status')
  const [submitting, setSubmitting] = useState(false)

  const contentTypes = [
    { value: 'status', label: 'Status Update', icon: FileText },
    { value: 'job', label: 'Job/Service', icon: Briefcase },
    { value: 'media', label: 'Photo/Video', icon: Image }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setSubmitting(true)
    
    // Sanitize inputs before submission
    const sanitizedContent = sanitizeText(content.trim())
    const sanitizedTitle = title ? sanitizeText(title.trim()) : undefined

    const result = await onCreatePost(
      sanitizedContent, 
      contentType, 
      sanitizedTitle
    )
    
    if (result.success) {
      setContent('')
      setTitle('')
      setContentType('status')
      onClose()
    }
    setSubmitting(false)
  }

  const resetForm = () => {
    setContent('')
    setTitle('')
    setContentType('status')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Create Post</DialogTitle>
            <button 
              onClick={handleClose}
              className="p-1 hover:bg-accent rounded-full"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* User Info */}
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
              {userProfile?.profile_picture_url ? (
                <img 
                  src={userProfile.profile_picture_url} 
                  alt={userProfile.full_name}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                userProfile?.full_name?.charAt(0) || 'U'
              )}
            </div>
            <div>
              <p className="font-semibold text-text-primary">
                {userProfile?.full_name || 'You'}
              </p>
              <p className="text-sm text-text-secondary">Posting to feed</p>
            </div>
          </div>

          {/* Content Type Selection */}
          <div>
            <label className="text-sm font-medium text-text-primary mb-2 block">
              Post Type
            </label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {contentTypes.map((type) => {
                  const IconComponent = type.icon
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Title (for jobs and media) */}
          {(contentType === 'job' || contentType === 'media') && (
            <div>
              <label className="text-sm font-medium text-text-primary mb-2 block">
                {contentType === 'job' ? 'Job Title' : 'Media Title'}
              </label>
              <SecureInput
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={contentType === 'job' ? 'e.g., Looking for a Web Developer' : 'e.g., Behind the scenes'}
                validation="text"
                maxLength={100}
              />
            </div>
          )}

          {/* Content */}
          <div>
            <label className="text-sm font-medium text-text-primary mb-2 block">
              {contentType === 'job' ? 'Job Description' : 'What\'s on your mind?'}
            </label>
            <SecureTextarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                contentType === 'job' 
                  ? 'Describe the job requirements, budget, timeline...' 
                  : 'Share your thoughts, updates, or announcements...'
              }
              maxLength={contentType === 'job' ? 2000 : 1000}
              contentModeration={true}
              rows={contentType === 'job' ? 6 : 4}
              required
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <BrandButton 
              type="button" 
              variant="outline" 
              className="flex-1" 
              onClick={handleClose}
            >
              Cancel
            </BrandButton>
            <BrandButton 
              type="submit" 
              className="flex-1"
              disabled={!content.trim() || submitting}
            >
              {submitting ? 'Posting...' : 'Post'}
            </BrandButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default CreatePostDialog