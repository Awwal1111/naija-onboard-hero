import React, { useState, useEffect } from 'react'
import { ArrowLeft, Upload, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { BrandButton } from '@/components/ui/brand-button'
import { SecureInput } from '@/components/ui/secure-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useNigerianStates } from '@/hooks/useNigerianStates'

const ExpertApplication = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const { states, lgas, loadingStates, loadingLGAs, fetchLGAs } = useNigerianStates()
  
  const [loading, setLoading] = useState(false)
  const [showCustomSkill, setShowCustomSkill] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    email: user?.email || '',
    skill_category: '',
    custom_skill: '',
    years_experience: '',
    portfolio_link: '',
    location_state: '',
    location_lga: '',
    location_area: ''
  })

  const skillCategories = [
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
    'Other'
  ]

  // Fetch LGAs when state changes
  useEffect(() => {
    if (formData.location_state) {
      const stateName = states.find(s => s.id === formData.location_state)?.name
      if (stateName) {
        fetchLGAs(stateName)
      }
      setFormData(prev => ({ ...prev, location_lga: '' }))
    }
  }, [formData.location_state, states])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to submit your application",
        variant: "destructive"
      })
      return
    }

    // Validate required fields
    const requiredFields = ['full_name', 'phone_number', 'skill_category', 'years_experience', 'location_state', 'location_lga', 'location_area']
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData])
    
    // Check if "Other" is selected but no custom skill provided
    if (formData.skill_category === 'Other' && !formData.custom_skill.trim()) {
      toast({
        title: "Incomplete Form",
        description: "Please enter your custom skill/profession",
        variant: "destructive"
      })
      return
    }
    
    if (missingFields.length > 0) {
      toast({
        title: "Incomplete Form",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    try {
      const selectedStateName = states.find(s => s.id === formData.location_state)?.name
      const selectedLGAName = lgas.find(l => l.name === formData.location_lga)?.name

      const { data, error } = await supabase
        .from('expert_applications')
        .insert([
          {
            user_id: user.id,
            full_name: formData.full_name,
            phone_number: formData.phone_number,
            email: formData.email,
            skill_category: formData.skill_category === 'Other' ? formData.custom_skill : formData.skill_category,
            years_experience: parseInt(formData.years_experience),
            portfolio_link: formData.portfolio_link || null,
            location_state: selectedStateName || formData.location_state,
            location_lga: selectedLGAName || formData.location_lga,
            location_area: formData.location_area,
            work_samples_urls: [] // Will implement file upload later
          }
        ])

      if (error) throw error

      toast({
        title: "Application Submitted!",
        description: "Your expert application has been submitted for review. You will receive an email confirmation shortly."
      })

      navigate('/profile')
    } catch (error) {
      console.error('Error submitting application:', error)
      toast({
        title: "Submission Failed",
        description: "Failed to submit your application. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Show custom skill input when "Other" is selected
    if (field === 'skill_category') {
      setShowCustomSkill(value === 'Other')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border px-6 py-4 flex items-center justify-between">
        <button onClick={() => navigate('/profile')} className="flex items-center gap-2">
          <ArrowLeft className="h-5 w-5 text-text-secondary" />
        </button>
        <Logo />
        <div className="w-5" /> {/* Spacer */}
      </header>

      <div className="px-6 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary mb-2">Apply for Expert Status</h1>
          <p className="text-text-secondary">Complete this application to become a verified expert on NaijaLancers</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Personal Information</h2>
            
            <SecureInput
              label="Full Name *"
              value={formData.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              placeholder="Enter your full name"
              validation="text"
              required
            />

            <SecureInput
              label="Phone Number *"
              type="tel"
              value={formData.phone_number}
              onChange={(e) => handleInputChange('phone_number', e.target.value)}
              placeholder="Enter your phone number"
              validation="phone"
              required
            />

            <SecureInput
              label="Email Address *"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter your email address"
              validation="email"
              required
              disabled
            />
          </div>

          {/* Professional Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Professional Information</h2>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">Skill Category *</label>
              <Select value={formData.skill_category} onValueChange={(value) => handleInputChange('skill_category', value)}>
                <SelectTrigger className="w-full h-10 bg-input">
                  <SelectValue placeholder="Select your primary skill" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border z-50">
                  {skillCategories.map((category) => (
                    <SelectItem key={category} value={category} className="hover:bg-accent">
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showCustomSkill && (
              <SecureInput
                label="Your Custom Skill/Profession *"
                value={formData.custom_skill}
                onChange={(e) => handleInputChange('custom_skill', e.target.value)}
                placeholder="Enter your skill or profession"
                validation="text"
                required
              />
            )}

            <SecureInput
              label="Years of Experience *"
              type="number"
              value={formData.years_experience}
              onChange={(e) => handleInputChange('years_experience', e.target.value)}
              placeholder="Enter years of experience"
              min="0"
              validation="none"
              required
            />

            <SecureInput
              label="Portfolio Link"
              type="url"
              value={formData.portfolio_link}
              onChange={(e) => handleInputChange('portfolio_link', e.target.value)}
              placeholder="https://your-portfolio.com"
              validation="none"
            />
          </div>

          {/* Location Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Location Information</h2>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">State *</label>
              <Select value={formData.location_state} onValueChange={(value) => handleInputChange('location_state', value)}>
                <SelectTrigger className="w-full h-10 bg-input">
                  <SelectValue placeholder="Select your state" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border z-50">
                  {states.map((state) => (
                    <SelectItem key={state.id} value={state.id} className="hover:bg-accent">
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">Local Government Area *</label>
              <Select 
                value={formData.location_lga} 
                onValueChange={(value) => handleInputChange('location_lga', value)}
                disabled={!formData.location_state}
              >
                <SelectTrigger className="w-full h-10 bg-input">
                  <SelectValue placeholder="Select your LGA" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border z-50">
                  {lgas.map((lga) => (
                    <SelectItem key={lga.id} value={lga.name} className="hover:bg-accent">
                      {lga.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <SecureInput
              label="Area/Location *"
              value={formData.location_area}
              onChange={(e) => handleInputChange('location_area', e.target.value)}
              placeholder="Enter your specific area/location"
              validation="text"
              required
            />
          </div>

          {/* Work Samples */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Work Samples</h2>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 text-text-secondary mx-auto mb-4" />
              <p className="text-text-secondary mb-2">Upload your work samples</p>
              <p className="text-sm text-text-secondary">PDF, images, or documents (Coming soon)</p>
            </div>
          </div>

          <BrandButton 
            type="submit"
            className="w-full" 
            size="lg"
            disabled={loading}
          >
            {loading ? 'Submitting Application...' : 'Submit Application'}
          </BrandButton>

          <div className="text-sm text-text-secondary text-center">
            <p>Your application will be reviewed within 1-3 business days.</p>
            <p>You will receive an email confirmation once submitted.</p>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ExpertApplication