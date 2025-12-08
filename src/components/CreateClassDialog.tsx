import React, { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useExpertClasses } from '@/hooks/useExpertClasses'
import { useToast } from '@/hooks/use-toast'
import { Upload, X, Video, Zap, Calendar } from 'lucide-react'

interface CreateClassDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CATEGORIES = [
  'Programming',
  'Design',
  'Marketing',
  'Business',
  'Finance',
  'Writing',
  'Photography',
  'Music',
  'Language',
  'Other'
]

export const CreateClassDialog: React.FC<CreateClassDialogProps> = ({ open, onOpenChange }) => {
  const { createClass } = useExpertClasses()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduled_start: '',
    duration_minutes: 60,
    max_participants: 20,
    is_free: true,
    price: 0,
    category: '',
    thumbnail_url: '',
    goLiveNow: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    } else if (formData.title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters'
    }

    if (!formData.goLiveNow && !formData.scheduled_start) {
      newErrors.scheduled_start = 'Please select a date and time'
    }

    if (!formData.goLiveNow && formData.scheduled_start) {
      const selectedDate = new Date(formData.scheduled_start)
      if (selectedDate <= new Date()) {
        newErrors.scheduled_start = 'Start time must be in the future'
      }
    }

    if (!formData.is_free && formData.price <= 0) {
      newErrors.price = 'Please enter a valid price'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please select an image file', variant: 'destructive' })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Image must be less than 5MB', variant: 'destructive' })
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = () => {
      setThumbnailPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Upload to Catbox
    try {
      const formDataUpload = new FormData()
      formDataUpload.append('reqtype', 'fileupload')
      formDataUpload.append('fileToUpload', file)
      
      const response = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        body: formDataUpload,
      })
      
      const url = await response.text()
      if (url.startsWith('https://')) {
        setFormData(prev => ({ ...prev, thumbnail_url: url }))
        toast({ title: 'Thumbnail uploaded!' })
      } else {
        throw new Error('Upload failed')
      }
    } catch (error) {
      console.error('Thumbnail upload error:', error)
      toast({ title: 'Failed to upload thumbnail', variant: 'destructive' })
      setThumbnailPreview(null)
    }
  }

  const removeThumbnail = () => {
    setThumbnailPreview(null)
    setFormData(prev => ({ ...prev, thumbnail_url: '' }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const classData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        duration_minutes: formData.duration_minutes,
        max_participants: formData.max_participants,
        is_free: formData.is_free,
        price: formData.is_free ? 0 : formData.price,
        thumbnail_url: formData.thumbnail_url,
        status: formData.goLiveNow ? 'live' : 'scheduled',
        class_type: 'live',
        scheduled_start: formData.goLiveNow 
          ? new Date().toISOString()
          : new Date(formData.scheduled_start).toISOString(),
      }

      await createClass(classData)
      
      toast({ 
        title: formData.goLiveNow ? 'Class is now live!' : 'Class created successfully!',
        description: formData.goLiveNow ? 'Participants can now join your class' : 'Your class has been scheduled'
      })
      
      onOpenChange(false)
      resetForm()
    } catch (error) {
      console.error('Create class error:', error)
      toast({ title: 'Failed to create class', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      scheduled_start: '',
      duration_minutes: 60,
      max_participants: 20,
      is_free: true,
      price: 0,
      category: '',
      thumbnail_url: '',
      goLiveNow: false,
    })
    setThumbnailPreview(null)
    setErrors({})
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm()
      onOpenChange(isOpen)
    }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Create New Class
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Thumbnail Upload */}
          <div className="space-y-2">
            <Label>Thumbnail (Optional)</Label>
            {thumbnailPreview ? (
              <div className="relative h-32 rounded-lg overflow-hidden">
                <img src={thumbnailPreview} alt="Thumbnail" className="w-full h-full object-cover" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={removeThumbnail}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Click to upload thumbnail</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleThumbnailUpload}
              className="hidden"
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Class Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Introduction to Web Development"
              className={errors.title ? 'border-destructive' : ''}
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What will participants learn?"
              rows={3}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Go Live Now Toggle */}
          <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <div>
                <Label htmlFor="goLiveNow" className="cursor-pointer">Go Live Now</Label>
                <p className="text-xs text-muted-foreground">Start your class immediately</p>
              </div>
            </div>
            <Switch
              id="goLiveNow"
              checked={formData.goLiveNow}
              onCheckedChange={(checked) => setFormData({ ...formData, goLiveNow: checked })}
            />
          </div>

          {/* Schedule Date/Time (if not going live now) */}
          {!formData.goLiveNow && (
            <div className="space-y-2">
              <Label htmlFor="scheduled_start">Schedule Date & Time *</Label>
              <Input
                id="scheduled_start"
                type="datetime-local"
                value={formData.scheduled_start}
                onChange={(e) => setFormData({ ...formData, scheduled_start: e.target.value })}
                min={new Date().toISOString().slice(0, 16)}
                className={errors.scheduled_start ? 'border-destructive' : ''}
              />
              {errors.scheduled_start && <p className="text-xs text-destructive">{errors.scheduled_start}</p>}
            </div>
          )}

          {/* Duration & Max Participants */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (mins)</Label>
              <Select
                value={formData.duration_minutes.toString()}
                onValueChange={(value) => setFormData({ ...formData, duration_minutes: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 mins</SelectItem>
                  <SelectItem value="45">45 mins</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_participants">Max Participants</Label>
              <Select
                value={formData.max_participants.toString()}
                onValueChange={(value) => setFormData({ ...formData, max_participants: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 people</SelectItem>
                  <SelectItem value="10">10 people</SelectItem>
                  <SelectItem value="20">20 people</SelectItem>
                  <SelectItem value="30">30 people</SelectItem>
                  <SelectItem value="50">50 people</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pricing */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label htmlFor="is_free">Free Class</Label>
              <p className="text-xs text-muted-foreground">No payment required to join</p>
            </div>
            <Switch
              id="is_free"
              checked={formData.is_free}
              onCheckedChange={(checked) => setFormData({ 
                ...formData, 
                is_free: checked, 
                price: checked ? 0 : formData.price 
              })}
            />
          </div>

          {!formData.is_free && (
            <div className="space-y-2">
              <Label htmlFor="price">Price (₦)</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                min="100"
                step="50"
                placeholder="e.g., 2000"
                className={errors.price ? 'border-destructive' : ''}
              />
              {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                'Creating...'
              ) : formData.goLiveNow ? (
                <>
                  <Zap className="h-4 w-4 mr-1" />
                  Go Live Now
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-1" />
                  Schedule Class
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
