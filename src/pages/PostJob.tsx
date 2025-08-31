import React, { useState } from 'react'
import { ArrowLeft, Upload, X, Camera } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { BrandButton } from '@/components/ui/brand-button'
import { BrandInput } from '@/components/ui/brand-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

const PostJob = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(false)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to post a job",
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

    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('jobs_services')
        .insert([
          {
            user_id: user.id,
            title: formData.title,
            description: formData.description,
            price: price,
            category: formData.category,
            photo_urls: [], // Will implement file upload later
            status: 'active'
          }
        ])

      if (error) throw error

      toast({
        title: "Job Posted Successfully!",
        description: "Your job/service has been published and is now visible to all users."
      })

      navigate('/feed')
    } catch (error) {
      console.error('Error posting job:', error)
      toast({
        title: "Posting Failed",
        description: "Failed to post your job/service. Please try again.",
        variant: "destructive"
      })
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
      <header className="bg-background border-b border-border px-6 py-4 flex items-center justify-between">
        <button onClick={() => navigate('/feed')} className="flex items-center gap-2">
          <ArrowLeft className="h-5 w-5 text-text-secondary" />
        </button>
        <Logo />
        <div className="w-5" /> {/* Spacer */}
      </header>

      <div className="px-6 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary mb-2">Post a Job/Service</h1>
          <p className="text-text-secondary">Create a listing for your product or service</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Basic Information</h2>
            
            <BrandInput
              label="Product/Service Name *"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="e.g., Professional Logo Design, Website Development"
              required
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">Category *</label>
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
              placeholder="Enter price amount"
              min="0"
              step="0.01"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Description</h2>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">
                Detailed Description *
                <span className="text-text-secondary font-normal"> (Max 500 characters)</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => {
                  if (e.target.value.length <= 500) {
                    handleInputChange('description', e.target.value)
                  }
                }}
                placeholder="Describe your product or service in detail. Include what you offer, delivery time, requirements, etc."
                className="flex min-h-[120px] w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
              />
              <div className="text-right text-xs text-text-secondary">
                {formData.description.length}/500 characters
              </div>
            </div>
          </div>

          {/* Photos */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Photos</h2>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Camera className="h-12 w-12 text-text-secondary mx-auto mb-4" />
              <p className="text-text-secondary mb-2">Upload photos of your work</p>
              <p className="text-sm text-text-secondary">Add images to showcase your product/service (Coming soon)</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-semibold text-text-primary mb-2">Preview</h3>
            <div className="space-y-2">
              <h4 className="font-medium text-text-primary">{formData.title || 'Your Service Title'}</h4>
              <p className="text-sm text-primary font-semibold">
                ₦{formData.price ? parseFloat(formData.price).toLocaleString() : '0'}
              </p>
              <p className="text-sm text-text-secondary">
                {formData.description || 'Your service description will appear here...'}
              </p>
              <span className="inline-block bg-primary/10 text-primary text-xs px-2 py-1 rounded">
                {formData.category || 'Category'}
              </span>
            </div>
          </div>

          <BrandButton 
            type="submit"
            className="w-full" 
            size="lg"
            disabled={loading}
          >
            {loading ? 'Publishing...' : 'Post Product/Service'}
          </BrandButton>

          <div className="text-sm text-text-secondary text-center">
            <p>Your listing will be immediately visible to all NaijaLancers users.</p>
            <p>You can manage and edit your listings from your profile.</p>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PostJob