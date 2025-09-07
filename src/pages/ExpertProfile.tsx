import React, { useState, useEffect } from 'react'
import { ArrowLeft, MessageCircle, Star, MapPin, Phone, Mail, Calendar, Award } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { BrandButton } from '@/components/ui/brand-button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StarRating } from '@/components/ui/star-rating'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface ExpertData {
  id: string
  user_id: string
  full_name: string
  email: string
  phone_number: string
  skill_category: string
  years_experience: number
  portfolio_link?: string
  location_state: string
  location_lga: string
  location_area: string
  status: string
  submitted_at: string
  profiles?: {
    full_name: string
    bio: string
    profession: string
    profile_picture_url: string
    average_rating: number
    rating_count: number
  } | null
}

const ExpertProfile = () => {
  const navigate = useNavigate()
  const { userId } = useParams()
  const { toast } = useToast()
  const [expert, setExpert] = useState<ExpertData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) {
      fetchExpertData()
    }
  }, [userId])

  const fetchExpertData = async () => {
    try {
      console.log('Fetching expert data for user ID:', userId)
      
      // Fetch expert application data
      const { data: expertApp, error: appError } = await supabase
        .from('expert_applications')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'approved')
        .single()

      if (appError) {
        console.error('Expert app error:', appError)
        throw appError
      }

      // Fetch profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, bio, profession, profile_picture_url, average_rating, rating_count')
        .eq('user_id', userId)
        .single()

      if (profileError) {
        console.warn('Profile error:', profileError)
      }

      const expertData = {
        ...expertApp,
        profiles: profile
      }

      console.log('Expert data:', expertData)
      setExpert(expertData)
    } catch (error) {
      console.error('Error fetching expert:', error)
      toast({
        title: "Error",
        description: "Failed to load expert profile",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStartChat = () => {
    navigate(`/chat/${userId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading expert profile...</p>
        </div>
      </div>
    )
  }

  if (!expert) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-background border-b border-border px-6 py-4 flex items-center">
          <button onClick={() => navigate(-1)} className="mr-4">
            <ArrowLeft className="h-6 w-6 text-text-secondary" />
          </button>
          <Logo />
        </header>
        <div className="px-6 py-8 text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-4">Expert Not Found</h1>
          <p className="text-text-secondary mb-6">This expert profile could not be found.</p>
          <BrandButton onClick={() => navigate('/experts')}>
            Back to Experts
          </BrandButton>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border px-6 py-4 flex items-center">
        <button onClick={() => navigate(-1)} className="mr-4">
          <ArrowLeft className="h-6 w-6 text-text-secondary" />
        </button>
        <Logo />
      </header>

      {/* Profile Content */}
      <div className="px-6 py-6 space-y-6">
        {/* Basic Info Card */}
        <Card className="bg-card border border-border">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              {/* Profile Picture */}
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold shrink-0">
                {expert.profiles?.full_name?.charAt(0) || expert.full_name.charAt(0)}
              </div>
              
              {/* Basic Info */}
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-text-primary mb-2">
                  {expert.profiles?.full_name || expert.full_name}
                </h1>
                
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary">
                    {expert.skill_category}
                  </Badge>
                  <Badge variant="outline">
                    {expert.years_experience} years experience
                  </Badge>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-3">
                  <StarRating
                    rating={expert.profiles?.average_rating || 0}
                    readonly
                    size="sm"
                  />
                  <span className="text-sm text-text-secondary">
                    {expert.profiles?.rating_count 
                      ? `${expert.profiles.rating_count} review${expert.profiles.rating_count !== 1 ? 's' : ''}`
                      : 'No reviews yet'
                    }
                  </span>
                </div>

                {/* Location */}
                <div className="flex items-center gap-2 text-text-secondary mb-4">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">
                    {expert.location_area}, {expert.location_lga}, {expert.location_state}
                  </span>
                </div>

                {/* Chat Button */}
                <BrandButton onClick={handleStartChat} className="w-full sm:w-auto">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Start Chat
                </BrandButton>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* About Section */}
        {expert.profiles?.bio && (
          <Card className="bg-card border border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                About
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-text-secondary leading-relaxed">
                {expert.profiles.bio}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Professional Details */}
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle>Professional Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {expert.profiles?.profession && (
              <div>
                <label className="text-sm font-medium text-text-primary">Profession</label>
                <p className="text-text-secondary">{expert.profiles.profession}</p>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium text-text-primary">Skill Category</label>
              <p className="text-text-secondary">{expert.skill_category}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-text-primary">Experience</label>
              <p className="text-text-secondary">{expert.years_experience} years</p>
            </div>
            
            {expert.portfolio_link && (
              <div>
                <label className="text-sm font-medium text-text-primary">Portfolio</label>
                <a 
                  href={expert.portfolio_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline block"
                >
                  View Portfolio
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-text-secondary" />
              <span className="text-text-secondary">{expert.email}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-text-secondary" />
              <span className="text-text-secondary">{expert.phone_number}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-text-secondary" />
              <span className="text-text-secondary">
                Expert since {new Date(expert.submitted_at).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ExpertProfile