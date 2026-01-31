import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Users, Globe, Lock, Plus, X, Image, Video, FileText, Briefcase, Loader2 } from 'lucide-react'
import { useFileUpload } from '@/hooks/useFileUpload'
import { useVideoUpload } from '@/hooks/useVideoUpload'
import { useToast } from '@/hooks/use-toast'
import { useRoleFeatures } from '@/hooks/useRoleFeatures'

interface EnhancedCreatePostDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreatePost: (content: string, contentType: string, visibility: string, title?: string, mediaUrls?: string[]) => Promise<{ success?: boolean; error?: string }>
  userProfile?: {
    full_name?: string
    profile_picture_url?: string
    profession?: string
  }
}

const EnhancedCreatePostDialog: React.FC<EnhancedCreatePostDialogProps> = ({
  isOpen,
  onClose,
  onCreatePost,
  userProfile
}) => {
  const { uploadFile, uploadProgress } = useFileUpload()
  const { uploadVideo, uploadProgress: videoProgress } = useVideoUpload()
  const { toast } = useToast()
  const { isClient, mode } = useRoleFeatures()
  
  // Only clients and 'both' mode users can post jobs
  const canPostJobs = isClient || mode === 'both'
  
  const [postType, setPostType] = useState<'status' | 'job' | 'media'>('status')
  const [visibility, setVisibility] = useState<'public' | 'connections' | 'private'>('public')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaUrls, setMediaUrls] = useState<string[]>([])
  const [mediaPreviews, setMediaPreviews] = useState<{ url: string; type: string }[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Job-specific fields
  const [jobData, setJobData] = useState({
    company: '',
    location: '',
    jobType: '',
    budget: '',
    skills: [] as string[]
  })
  const [newSkill, setNewSkill] = useState('')

  const resetForm = () => {
    setPostType('status')
    setVisibility('public')
    setTitle('')
    setContent('')
    setMediaFiles([])
    setMediaUrls([])
    setMediaPreviews([])
    setJobData({
      company: '',
      location: '',
      jobType: '',
      budget: '',
      skills: []
    })
    setNewSkill('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleFileUpload = async (files: FileList) => {
    const fileArray = Array.from(files)
    
    // Limit to 10 files
    if (mediaFiles.length + fileArray.length > 10) {
      toast({
        title: "Too many files",
        description: "You can upload a maximum of 10 files",
        variant: "destructive"
      })
      return
    }

    setUploading(true)
    const newPreviews: { url: string; type: string }[] = []
    const uploadedUrls: string[] = []

    try {
      for (const file of fileArray) {
        // Create preview
        const previewUrl = URL.createObjectURL(file)
        newPreviews.push({ url: previewUrl, type: file.type })
        
        // Upload based on file type
        if (file.type.startsWith('video/')) {
          const result = await uploadVideo(file, 'feed')
          if (result?.videoUrl) {
            uploadedUrls.push(result.videoUrl)
          }
        } else if (file.type.startsWith('image/')) {
          const { url } = await uploadFile(file, 'Feed')
          if (url) {
            uploadedUrls.push(url)
          }
        }
      }
      
      setMediaFiles(prev => [...prev, ...fileArray])
      setMediaPreviews(prev => [...prev, ...newPreviews])
      setMediaUrls(prev => [...prev, ...uploadedUrls])
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload some files",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
    }
  }

  const removeMedia = (index: number) => {
    // Revoke the preview URL to free memory
    if (mediaPreviews[index]) {
      URL.revokeObjectURL(mediaPreviews[index].url)
    }
    setMediaFiles(prev => prev.filter((_, i) => i !== index))
    setMediaUrls(prev => prev.filter((_, i) => i !== index))
    setMediaPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const addSkill = () => {
    if (newSkill.trim() && !jobData.skills.includes(newSkill.trim())) {
      setJobData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }))
      setNewSkill('')
    }
  }

  const removeSkill = (skillToRemove: string) => {
    setJobData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setSubmitting(true)

    let finalContent = content
    let finalTitle = title

    // For job posts, format content with job details
    if (postType === 'job') {
      finalTitle = title || 'Job Opportunity'
      finalContent = `${content}

📍 Location: ${jobData.location || 'Not specified'}
💼 Type: ${jobData.jobType || 'Not specified'}
💰 Budget: ${jobData.budget || 'Negotiable'}
🏢 Company: ${jobData.company || 'Not specified'}
${jobData.skills.length > 0 ? `🎯 Skills: ${jobData.skills.join(', ')}` : ''}`
    }

    const result = await onCreatePost(
      finalContent,
      postType,
      visibility,
      finalTitle,
      mediaUrls.length > 0 ? mediaUrls : undefined
    )

    setSubmitting(false)

    if (result.success) {
      handleClose()
    }
  }

  const visibilityOptions = [
    { value: 'public', label: 'Public', icon: Globe, description: 'Everyone can see this post' },
    { value: 'connections', label: 'Connections', icon: Users, description: 'Only your connections can see this' },
    { value: 'private', label: 'Private', icon: Lock, description: 'Only you can see this post' }
  ]

  const getVisibilityConfig = () => {
    return visibilityOptions.find(opt => opt.value === visibility)
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => !submitting && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User info */}
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={userProfile?.profile_picture_url} />
              <AvatarFallback>
                {userProfile?.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{userProfile?.full_name || 'User'}</p>
              {userProfile?.profession && (
                <p className="text-sm text-text-secondary">{userProfile.profession}</p>
              )}
            </div>
          </div>

          {/* Post type selector - hide Job Post for freelancer-only users */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={postType === 'status' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPostType('status')}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              Status
            </Button>
            {canPostJobs && (
              <Button
                type="button"
                variant={postType === 'job' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPostType('job')}
                className="gap-2"
              >
                <Briefcase className="h-4 w-4" />
                Job Post
              </Button>
            )}
            <Button
              type="button"
              variant={postType === 'media' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPostType('media')}
              className="gap-2"
            >
              <Image className="h-4 w-4" />
              Media
            </Button>
          </div>

          {/* Visibility selector */}
          <div>
            <Label>Visibility</Label>
            <Select value={visibility} onValueChange={(value: any) => setVisibility(value)}>
              <SelectTrigger>
                <SelectValue>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const config = getVisibilityConfig()
                      const IconComponent = config?.icon
                      return IconComponent ? <IconComponent className="h-4 w-4" /> : null
                    })()}
                    {getVisibilityConfig()?.label}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {visibilityOptions.map((option) => {
                  const IconComponent = option.icon
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4" />
                        <div>
                          <p>{option.label}</p>
                          <p className="text-xs text-text-secondary">{option.description}</p>
                        </div>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Title field for job posts and media */}
          {(postType === 'job' || postType === 'media') && (
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={postType === 'job' ? 'Job title' : 'Media title'}
                required
              />
            </div>
          )}

          {/* Job-specific fields */}
          {postType === 'job' && (
            <div className="space-y-4 p-4 bg-accent/50 rounded-lg">
              <h4 className="font-semibold">Job Details</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={jobData.company}
                    onChange={(e) => setJobData(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="Company name"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={jobData.location}
                    onChange={(e) => setJobData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Job location"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="jobType">Job Type</Label>
                  <Select 
                    value={jobData.jobType} 
                    onValueChange={(value) => setJobData(prev => ({ ...prev, jobType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="remote">Remote</SelectItem>
                      <SelectItem value="onsite">On-site</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="freelance">Freelance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="budget">Budget</Label>
                  <Input
                    id="budget"
                    value={jobData.budget}
                    onChange={(e) => setJobData(prev => ({ ...prev, budget: e.target.value }))}
                    placeholder="e.g. ₦50,000 - ₦100,000"
                  />
                </div>
              </div>

              <div>
                <Label>Required Skills</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="Add a skill"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  />
                  <Button type="button" size="sm" onClick={addSkill}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {jobData.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="gap-1">
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Content field */}
          <div>
            <Label htmlFor="content">
              {postType === 'job' ? 'Job Description *' : 'What\'s on your mind? *'}
            </Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                postType === 'job' 
                  ? 'Describe the job requirements, responsibilities, and qualifications...'
                  : 'Share your thoughts, insights, or updates...'
              }
              rows={5}
              required
            />
          </div>

          {/* Media upload - available for status and media posts */}
          {(postType === 'status' || postType === 'media') && (
            <div>
              <Label>Add Photos/Videos (optional)</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  className="hidden"
                  id="media-upload"
                  disabled={uploading}
                />
                <label htmlFor="media-upload" className={`cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex flex-col items-center gap-2">
                    {uploading ? (
                      <>
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <p className="text-sm text-muted-foreground">
                          Uploading... {videoProgress.isUploading ? `${videoProgress.progress}%` : ''}
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <Image className="h-8 w-8 text-muted-foreground" />
                          <Video className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Click to upload images or videos (max 10 files)
                        </p>
                      </>
                    )}
                  </div>
                </label>
              </div>

              {/* Upload progress */}
              {(uploadProgress.isUploading || videoProgress.isUploading) && (
                <div className="mt-2">
                  <Progress value={videoProgress.isUploading ? videoProgress.progress : uploadProgress.progress} className="h-2" />
                </div>
              )}

              {/* Media preview */}
              {mediaPreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {mediaPreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                        {preview.type.startsWith('image/') ? (
                          <img
                            src={preview.url}
                            alt={`Upload ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="relative w-full h-full bg-black flex items-center justify-center">
                            <video
                              src={preview.url}
                              className="w-full h-full object-cover"
                              muted
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="bg-black/60 rounded-full p-2">
                                <Video className="h-6 w-6 text-white" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMedia(index)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Submit buttons */}
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={submitting || !content.trim() || uploadProgress.isUploading || videoProgress.isUploading || uploading}
              className="flex-1"
            >
              {submitting ? 'Creating...' : uploading ? 'Uploading...' : 'Create Post'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={submitting || uploading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default EnhancedCreatePostDialog