import React, { useState, useEffect } from 'react'
import { Search, Filter, Star, MapPin, MessageCircle, User as UserIcon, Home, Users, DollarSign, Briefcase } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { BrandInput } from '@/components/ui/brand-input'
import { BrandButton } from '@/components/ui/brand-button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StarRating } from '@/components/ui/star-rating'
import { RatingDialog } from '@/components/ui/rating-dialog'
import { useExpertRatings } from '@/hooks/useExpertRatings'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'

interface Expert {
  id: string
  user_id: string
  full_name: string
  skill_category: string
  years_experience: number
  location_state: string
  location_lga: string
  location_area: string
  status: string
  profiles?: {
    full_name: string
    bio: string
    profession: string
    profile_picture_url: string
    average_rating: number
    rating_count: number
  } | null
}

const Experts = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const [experts, setExperts] = useState<Expert[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [stateFilter, setStateFilter] = useState('all')
  const [skillFilter, setSkillFilter] = useState('all')
  const [selectedExpert, setSelectedExpert] = useState<string | null>(null)
  const { submitRating } = useExpertRatings(selectedExpert || undefined)

  const bottomNavItems = [
    { icon: Home, label: 'Feed', path: '/feed' },
    { icon: MessageCircle, label: 'Chat', path: '/chat' },
    { icon: Users, label: 'Expert', path: '/experts', active: true },
    { icon: Briefcase, label: 'Gig', path: '/jobs' },
    { icon: DollarSign, label: 'Earn', path: '/earn' },
    { icon: UserIcon, label: 'Profile', path: '/profile' }
  ]

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
    'Business Consulting'
  ]

  const nigerianStates = [
    'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
    'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Abuja', 'Gombe', 'Imo',
    'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
    'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba',
    'Yobe', 'Zamfara'
  ]

  useEffect(() => {
    fetchExperts()
  }, [])

  const fetchExperts = async () => {
    try {
      // Fetch expert applications first
      const { data: expertApps, error: appsError } = await supabase
        .from('expert_applications')
        .select('*')
        .eq('status', 'approved')
        .order('submitted_at', { ascending: false })
      
      if (appsError) throw appsError

      // Fetch corresponding profiles
      const userIds = expertApps?.map(app => app.user_id) || []
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, bio, profession, profile_picture_url, average_rating, rating_count')
        .in('user_id', userIds)
      
      if (profilesError) console.warn('Profile fetch error:', profilesError)

      // Combine the data
      const expertsWithProfiles = expertApps?.map(app => ({
        ...app,
        profiles: profiles?.find(p => p.user_id === app.user_id) || null
      })) || []
      
      setExperts(expertsWithProfiles)
    } catch (error) {
      console.error('Error fetching experts:', error)
      toast({
        title: "Error",
        description: `Failed to load experts directory: ${error.message}`,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRatingSubmit = async (expertUserId: string, rating: number, comment?: string) => {
    setSelectedExpert(expertUserId)
    const result = await submitRating(rating, comment)
    if (result.success) {
      // Refresh the experts list to show updated ratings
      fetchExperts()
    }
    setSelectedExpert(null)
  }

  const filteredExperts = experts.filter(expert => {
    const matchesSearch = expert.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         expert.skill_category.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesState = !stateFilter || stateFilter === 'all' || expert.location_state === stateFilter
    const matchesSkill = !skillFilter || skillFilter === 'all' || expert.skill_category === skillFilter
    
    return matchesSearch && matchesState && matchesSkill
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-20">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading experts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-background border-b border-border px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">Experts Directory</h1>
          <div className="text-sm text-text-secondary">{filteredExperts.length} experts</div>
        </div>
      </header>

      <div className="px-6 py-4">
        {/* Search and Filters */}
        <div className="space-y-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-text-secondary" />
            <BrandInput
              placeholder="Search by name or skill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-3">
            <div className="flex-1">
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger className="w-full h-10 bg-input">
                  <SelectValue placeholder="Filter by state" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border z-50 max-h-60 overflow-y-auto">
                  <SelectItem value="all" className="hover:bg-accent">All States</SelectItem>
                  {nigerianStates.map((state) => (
                    <SelectItem key={state} value={state} className="hover:bg-accent">
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <Select value={skillFilter} onValueChange={setSkillFilter}>
                <SelectTrigger className="w-full h-10 bg-input">
                  <SelectValue placeholder="Filter by skill" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border z-50 max-h-60 overflow-y-auto">
                  <SelectItem value="all" className="hover:bg-accent">All Skills</SelectItem>
                  {skillCategories.map((skill) => (
                    <SelectItem key={skill} value={skill} className="hover:bg-accent">
                      {skill}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Experts Grid */}
        {filteredExperts.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-text-secondary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">No Experts Found</h3>
            <p className="text-text-secondary">
              {searchQuery || stateFilter || skillFilter 
                ? 'Try adjusting your search filters'
                : 'No verified experts available yet'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredExperts.map((expert) => (
              <div
                key={expert.id}
                className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  {/* Profile Picture */}
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0">
                    {expert.profiles?.full_name?.charAt(0) || expert.full_name.charAt(0)}
                  </div>
                  
                  {/* Expert Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-text-primary truncate">
                      {expert.profiles?.full_name || expert.full_name}
                    </h3>
                    <p className="text-primary font-medium text-sm mb-2">
                      {expert.skill_category}
                    </p>
                    
                    {/* Rating */}
                    <div className="flex items-center gap-2 mb-2">
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
                    <div className="flex items-center gap-1 mb-3">
                      <MapPin className="h-4 w-4 text-text-secondary" />
                      <span className="text-sm text-text-secondary">
                        {expert.location_area}, {expert.location_lga}, {expert.location_state}
                      </span>
                    </div>

                    {/* Experience */}
                    <p className="text-sm text-text-secondary mb-4">
                      {expert.years_experience} years experience
                    </p>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mb-2">
                      <BrandButton 
                        size="sm" 
                        className="flex-1"
                        onClick={() => navigate(`/chat/${expert.user_id}`)}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Chat
                      </BrandButton>
                      <BrandButton 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => navigate(`/expert/${expert.user_id}`)}
                      >
                        View Profile
                      </BrandButton>
                    </div>

                    {/* Rating Button */}
                    {user && user.id !== expert.user_id && (
                      <RatingDialog
                        onSubmit={(rating, comment) => handleRatingSubmit(expert.user_id, rating, comment)}
                        trigger={
                          <BrandButton variant="outline" size="sm" className="w-full">
                            <Star className="h-4 w-4 mr-2" />
                            Rate Expert
                          </BrandButton>
                        }
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-2">
        <div className="flex justify-around items-center">
          {bottomNavItems.map((item) => (
            <Link 
              key={item.label} 
              to={item.path}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-colors ${
                item.active 
                  ? 'text-primary bg-primary/10' 
                  : 'text-text-secondary hover:text-primary hover:bg-primary/5'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Experts