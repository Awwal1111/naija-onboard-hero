import React, { useState, useEffect } from 'react'
import { Search, Filter, Star, MapPin, MessageCircle, Home, Users, DollarSign, Briefcase, Menu, Video, Plus, TrendingUp } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { MoreMenuDrawer } from '@/components/MoreMenuDrawer'
import { BrandInput } from '@/components/ui/brand-input'
import { BrandButton } from '@/components/ui/brand-button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StarRating } from '@/components/ui/star-rating'
import { RatingDialog } from '@/components/ui/rating-dialog'
import { useExpertRatings } from '@/hooks/useExpertRatings'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import ProfilePreview from '@/components/ProfilePreview'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ClassCard } from '@/components/ClassCard'
import { CreateClassDialog } from '@/components/CreateClassDialog'
import { useExpertClasses } from '@/hooks/useExpertClasses'
import { Skeleton } from '@/components/ui/skeleton'
import { usePersonalizedExperts, PersonalizedExpert } from '@/hooks/usePersonalizedDiscovery'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

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
  const [searchQuery, setSearchQuery] = useState('')
  const location = useLocation()
  const [stateFilter, setStateFilter] = useState('all')
  const [skillFilter, setSkillFilter] = useState('all')
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [profilePreview, setProfilePreview] = useState<{ isOpen: boolean; userId: string | null }>({ isOpen: false, userId: null })
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const { liveClasses, upcomingClasses, featuredClasses, pastClasses, isLoading: classesLoading } = useExpertClasses()
  
  // Use personalized experts algorithm
  const { experts: personalizedExperts, loading } = usePersonalizedExperts(50)

  const bottomNavItems = [
    { icon: Home, label: 'Feed', path: '/feed' },
    { icon: MessageCircle, label: 'Chat', path: '/chat' },
    { icon: Users, label: 'Expert', path: '/experts' },
    { icon: Briefcase, label: 'Gig', path: '/jobs' },
    { icon: DollarSign, label: 'Earn', path: '/earn' }
  ]

  const handleNavigation = (path: string) => {
    navigate(path)
  }

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
    if (user) {
      supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => setUserProfile(data))
    }
  }, [user])

  // Transform personalized experts to match expected format
  const experts = personalizedExperts.map((expert: PersonalizedExpert) => ({
    id: expert.id,
    user_id: expert.user_id,
    full_name: expert.full_name,
    skill_category: expert.skill_category,
    years_experience: expert.years_experience,
    location_state: expert.location_state,
    location_lga: expert.location_lga,
    location_area: expert.location_area,
    status: expert.status,
    relevance_score: expert.relevance_score,
    profiles: {
      full_name: expert.full_name,
      bio: expert.bio || '',
      profession: expert.profession || expert.skill_category,
      profile_picture_url: expert.profile_picture_url || '',
      average_rating: expert.average_rating,
      rating_count: expert.rating_count
    }
  }))

  const handleRatingSubmit = async (expertUserId: string, rating: number, comment?: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to rate this expert",
        variant: "destructive"
      })
      return
    }

    // Verify expert profile exists
    const { data: profileCheck, error: checkError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', expertUserId)
      .single()

    if (checkError || !profileCheck) {
      toast({
        title: "Error",
        description: "Expert profile not found. Please try again later.",
        variant: "destructive"
      })
      return
    }

    try {
      const { data, error } = await supabase
        .from('expert_ratings')
        .insert({
          expert_id: expertUserId,
          user_id: user.id,
          rating,
          comment: comment || null
        })
        .select()
        .single()

      if (error) {
        if (error.message?.includes('duplicate') || error.code === '23505') {
          toast({
            title: "Already Rated",
            description: "You have already rated this expert",
            variant: "destructive"
          })
        } else {
          throw error
        }
        return
      }

      toast({
        title: "Success",
        description: "Rating submitted successfully!",
      })
    } catch (error: any) {
      console.error('Error submitting rating:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to submit rating",
        variant: "destructive"
      })
    }
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
      
      {/* Header */}
      <header className="bg-background border-b border-border px-6 py-4 sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-primary">Experts</h1>
      </header>

      <div className="px-6 py-4">
        <Tabs defaultValue="experts" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="experts">Expert List</TabsTrigger>
            <TabsTrigger value="classes">ExpertClass</TabsTrigger>
          </TabsList>

          {/* Expert List Tab */}
          <TabsContent value="experts" className="space-y-4">
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
                  <div 
                    className="shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setProfilePreview({ isOpen: true, userId: expert.user_id })}
                  >
                    <Avatar className="w-16 h-16">
                      <AvatarImage 
                        src={expert.profiles?.profile_picture_url} 
                        alt={expert.profiles?.full_name || expert.full_name}
                      />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                        {expert.profiles?.full_name?.charAt(0) || expert.full_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  
                  {/* Expert Info */}
                  <div className="flex-1 min-w-0">
                    <h3 
                      className="text-lg font-semibold text-text-primary truncate cursor-pointer hover:text-primary transition-colors"
                      onClick={() => setProfilePreview({ isOpen: true, userId: expert.user_id })}
                    >
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
          </TabsContent>

            {/* ExpertClass Tab */}
            <TabsContent value="classes" className="space-y-4">
              {/* Create Class Button for Experts */}
              {userProfile?.is_expert === true && (
                <div className="flex justify-end mb-4">
                  <BrandButton onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-5 w-5 mr-2" />
                    Create Class
                  </BrandButton>
                </div>
              )}

              {/* Explanation for regular users */}
              {userProfile?.is_expert !== true && (
                <div className="bg-muted/50 rounded-lg p-6 mb-6 border border-border">
                  <h3 className="font-semibold text-lg mb-2">About ExpertClass</h3>
                  <p className="text-muted-foreground">
                    ExpertClass is a live video classroom where verified experts can host sessions, workshops, and training.
                    Only approved experts can create classes. To become an expert, apply through the Expert Application page.
                  </p>
                </div>
              )}

            {/* Live Classes */}
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Video className="h-5 w-5 text-red-500" />
                Live Now
              </h2>
              {classesLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Skeleton className="h-48 w-full rounded-lg" />
                  <Skeleton className="h-48 w-full rounded-lg" />
                </div>
              ) : liveClasses.length === 0 ? (
                <div className="text-center py-8 bg-card rounded-lg border border-border">
                  <Video className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No live classes right now</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {liveClasses.map((classItem) => (
                    <ClassCard key={classItem.id} classItem={classItem} />
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Classes */}
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-4">Upcoming Classes</h2>
              {classesLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Skeleton className="h-48 w-full rounded-lg" />
                </div>
              ) : upcomingClasses.length === 0 ? (
                <div className="text-center py-8 bg-card rounded-lg border border-border">
                  <p className="text-muted-foreground">No upcoming classes scheduled</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {upcomingClasses.map((classItem) => (
                    <ClassCard key={classItem.id} classItem={classItem} />
                  ))}
                </div>
              )}
            </div>

            {/* Featured Classes */}
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Featured Classes
              </h2>
              {classesLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Skeleton className="h-48 w-full rounded-lg" />
                </div>
              ) : featuredClasses.length === 0 ? (
                <div className="text-center py-8 bg-card rounded-lg border border-border">
                  <p className="text-muted-foreground">No featured classes available</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {featuredClasses.map((classItem) => (
                    <ClassCard key={classItem.id} classItem={classItem} />
                  ))}
                </div>
              )}
            </div>

            {/* Past Classes (History) */}
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Video className="h-5 w-5 text-muted-foreground" />
                Class History
              </h2>
              {classesLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Skeleton className="h-48 w-full rounded-lg" />
                </div>
              ) : pastClasses.length === 0 ? (
                <div className="text-center py-8 bg-card rounded-lg border border-border">
                  <p className="text-muted-foreground">No past classes yet</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pastClasses.map((classItem) => (
                    <ClassCard key={classItem.id} classItem={classItem} />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border px-1 sm:px-4 py-1.5 sm:py-2 safe-area-bottom z-50">
        <div className="flex justify-around items-center max-w-md mx-auto">
          {bottomNavItems.map((item) => (
            <button
              key={item.label}
              onClick={() => handleNavigation(item.path)}
              className={`flex flex-col items-center gap-0.5 sm:gap-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl transition-colors ${
                location.pathname === item.path
                  ? 'text-primary bg-primary/10'
                  : 'text-text-secondary hover:text-primary hover:bg-primary/5'
              }`}
            >
              <item.icon className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-[10px] sm:text-xs font-medium">{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => setMoreMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 sm:gap-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl transition-colors text-text-secondary hover:text-primary hover:bg-primary/5"
          >
            <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="text-[10px] sm:text-xs font-medium">More</span>
          </button>
        </div>
      </div>
      <MoreMenuDrawer open={moreMenuOpen} onOpenChange={setMoreMenuOpen} />

      {/* Profile Preview Dialog */}
      <ProfilePreview
        isOpen={profilePreview.isOpen}
        onClose={() => setProfilePreview({ isOpen: false, userId: null })}
        profileId={profilePreview.userId || ''}
      />

      {/* Create Class Dialog */}
      <CreateClassDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  )
}

export default Experts