import React, { useState, useRef } from 'react'
import { ArrowLeft, Upload, X, Camera, Image as ImageIcon, Loader2, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { BrandButton } from '@/components/ui/brand-button'
import { BrandInput } from '@/components/ui/brand-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { AIWritingAssistant } from '@/components/AIWritingAssistant'

const PostJob = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [loading, setLoading] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: ''
  })

  const jobCategories = [
    'Web Development',
    'Mobile App Development',
    'UI/UX Design',
    'Graphic Design',
    'Digital Marketing',
    'Content Writing',
    'Data Analysis',
    'Video Editing',
    'Photography',
    'Social Media Management',
    'Virtual Assistant',
    'Accounting & Finance',
    'Translation Services',
    'Voice Over',
    'Music Production',
    'Architecture',
    'Engineering',
    'Legal Services',
    'Business Consulting',
    'AI & Automation',
    'AI Web & Support',
    'AI Training & Consulting',
    'AI Video & Audio',
    'AI Data & BI',
    'Event Planning',
    'Fashion Design',
    'Interior Design',
    'Teaching & Tutoring',
    'Health & Fitness',
    'Beauty & Wellness',
    'Cleaning Services',
    'Delivery Services',
    'Repair & Maintenance',
    'Security Services',
    'Catering & Food',
    'Transportation',
    'Real Estate',
    'Agriculture',
    'Manufacturing',
    'Trading & Sales',
    'Other'
  ]

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Limit to 5 images
    const totalImages = selectedImages.length + files.length
    if (totalImages > 5) {
      toast({
        title: 'Too many images',
        description: 'You can upload a maximum of 5 images',
        variant: 'destructive'
      })
      return
    }

    // Validate file types and sizes
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: `${file.name} is not an image`,
          variant: 'destructive'
        })
        return false
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: 'File too large',
          description: `${file.name} is larger than 5MB`,
          variant: 'destructive'
        })
        return false
      }
      return true
    })

    // Create preview URLs
    const newPreviews = validFiles.map(file => URL.createObjectURL(file))
    
    setSelectedImages(prev => [...prev, ...validFiles])
    setPreviewUrls(prev => [...prev, ...newPreviews])
  }

  const removeImage = (index: number) => {
    // Revoke the object URL to free memory
    URL.revokeObjectURL(previewUrls[index])
    
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
    setPreviewUrls(prev => prev.filter((_, i) => i !== index))
  }

  const uploadImages = async (): Promise<string[]> => {
    if (!user || selectedImages.length === 0) return []

    setUploadingImages(true)
    const uploadedUrls: string[] = []

    try {
      for (const file of selectedImages) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

        const { data, error } = await supabase.storage
          .from('gig-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (error) {
          console.error('Upload error:', error)
          throw error
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('gig-images')
          .getPublicUrl(fileName)

        uploadedUrls.push(urlData.publicUrl)
      }

      return uploadedUrls
    } catch (error) {
      console.error('Error uploading images:', error)
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload images. Please try again.',
        variant: 'destructive'
      })
      return []
    } finally {
      setUploadingImages(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to post a service",
        variant: "destructive"
      })
      return
    }

    // Validate required fields
    const requiredFields = ['title', 'description', 'price', 'category']
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData])
    
    if (missingFields.length > 0) {
      toast({
        title: "Incomplete Form",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    // Validate price
    const price = parseFloat(formData.price)
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price amount",
        variant: "destructive"
      })
      return
    }

    // Client-side spam pre-check (mirrors server-side trigger for instant feedback)
    const combined = `${formData.title}\n${formData.description}`.toLowerCase()
    const jobListingPattern = /\b(hiring|we are hiring|now hiring|looking for a (personal assistant|freelancer|remote|virtual)|remote jobs?|work[ -]from[ -]home|jobseekers?|apply now|send (your )?(cv|resume))\b/i
    const promoPattern = /\b(download (this |the |our )?(app|game)|sign ?up (and|to)|earn \$?\d+|play to earn|refer(ral)? code|use my (code|link)|join my team|click (the )?link|register (now|here|today))\b/i
    const externalContactPattern = /\b(whatsapp|telegram|wa\.me|t\.me|chat me on|dm me on|message me on)\b/i

    if (jobListingPattern.test(combined)) {
      toast({
        title: "This looks like a job posting",
        description: "Gigs are services you offer. To hire someone, please use the Jobs section instead.",
        variant: "destructive"
      })
      return
    }
    if (promoPattern.test(combined)) {
      toast({
        title: "Promotional content not allowed",
        description: "Gigs must describe a real service you provide. Please remove referral, sign-up or 'download app' content.",
        variant: "destructive"
      })
      return
    }
    if (externalContactPattern.test(combined) && /\d{7,}/.test(combined)) {
      toast({
        title: "External contact not allowed",
        description: "Don't include WhatsApp/Telegram numbers in gigs. Buyers will message you through the in-app chat.",
        variant: "destructive"
      })
      return
    }
    if (formData.title.trim().length < 8) {
      toast({ title: "Title too short", description: "Please write a clear, descriptive gig title (at least 8 characters).", variant: "destructive" })
      return
    }
    if (formData.description.trim().length < 40) {
      toast({ title: "Description too short", description: "Please describe your service in at least 40 characters so buyers know what they're getting.", variant: "destructive" })
      return
    }

    setLoading(true)

    try {
      // Upload images first
      const photoUrls = await uploadImages()

      const { data, error } = await supabase
        .from('jobs_services')
        .insert([
          {
            user_id: user.id,
            title: formData.title,
            description: formData.description,
            price: price,
            category: formData.category,
            photo_urls: photoUrls,
            status: 'active'
          }
        ])

      if (error) throw error

      toast({
        title: "Service Posted Successfully!",
        description: "Your service is now visible to all users."
      })

      navigate('/jobs')
    } catch (error: any) {
      console.error('Error posting service:', error)
      const msg = String(error?.message || '')
      if (msg.includes('GIG_SPAM_BLOCKED')) {
        toast({
          title: "Posting blocked: spam detected",
          description: error?.hint || "Your listing looks like a job posting or promotional content. Use the Jobs section for hiring, and write a real service description for gigs.",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Posting Failed",
          description: "Failed to post your service. Please try again.",
          variant: "destructive"
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </button>
        <h1 className="font-semibold">Create Service</h1>
        <div className="w-5" />
      </header>

      <div className="px-4 sm:px-6 py-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold mb-1">Post a Service (Gig)</h1>
          <p className="text-sm text-muted-foreground">Create a listing for your product or service</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photos Section - Moved to top for better UX */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold">Photos *</h2>
            <p className="text-xs text-muted-foreground">Add up to 5 images to showcase your work. First image will be the cover.</p>
            
            {/* Image Previews */}
            {previewUrls.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                    <img
                      src={url}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    {index === 0 && (
                      <span className="absolute bottom-1 left-1 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                        Cover
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button */}
            {previewUrls.length < 5 && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
              >
                <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-1">Click to upload images</p>
                <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB each</p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>

          {/* Basic Information */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Basic Information</h2>
              <AIWritingAssistant
                text={formData.title}
                onApply={(text) => handleInputChange('title', text)}
                context="gig"
                contextData={{ profession: formData.category }}
                variant="button"
              />
            </div>
            
            <BrandInput
              label="Service Title *"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="e.g., Professional Logo Design, Website Development"
              required
            />

            <div className="space-y-2">
              <label className="text-sm font-medium">Category *</label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                <SelectTrigger className="w-full h-10 bg-input">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border z-50 max-h-60 overflow-y-auto">
                  {jobCategories.map((category) => (
                    <SelectItem key={category} value={category} className="hover:bg-accent">
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <BrandInput
              label="Price (₦) *"
              type="number"
              value={formData.price}
              onChange={(e) => handleInputChange('price', e.target.value)}
              placeholder="Starting price for your service"
              min="0"
              step="0.01"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Description</h2>
              <AIWritingAssistant
                text={formData.description}
                onApply={(text) => handleInputChange('description', text.slice(0, 500))}
                context="gig"
                contextData={{ profession: formData.category }}
                variant="icon"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Detailed Description *
                <span className="text-muted-foreground font-normal"> (Max 500 characters)</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => {
                  if (e.target.value.length <= 500) {
                    handleInputChange('description', e.target.value)
                  }
                }}
                placeholder="Describe your service in detail. Include what you offer, delivery time, what's included, etc."
                className="flex min-h-[120px] w-full rounded-lg border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
              />
              <div className="text-right text-xs text-muted-foreground">
                {formData.description.length}/500 characters
              </div>
            </div>
          </div>

          {/* Preview Card */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-semibold text-sm mb-3">Preview</h3>
            <div className="flex gap-3">
              <div className="w-20 h-14 rounded-md overflow-hidden bg-muted flex-shrink-0">
                {previewUrls[0] ? (
                  <img src={previewUrls[0]} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm line-clamp-1">{formData.title || 'Your Service Title'}</h4>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {formData.description || 'Your service description...'}
                </p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded">
                    {formData.category || 'Category'}
                  </span>
                  <span className="text-sm font-bold text-primary">
                    ₦{formData.price ? parseFloat(formData.price).toLocaleString() : '0'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <BrandButton 
            type="submit"
            className="w-full" 
            size="lg"
            disabled={loading || uploadingImages}
          >
            {loading || uploadingImages ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {uploadingImages ? 'Uploading Images...' : 'Publishing...'}
              </>
            ) : (
              'Publish Service'
            )}
          </BrandButton>

          <p className="text-xs text-muted-foreground text-center">
            Your listing will be immediately visible to all NaijaLancers users.
          </p>
        </form>
      </div>
    </div>
  )
}

export default PostJob