import React, { useState, useEffect, useMemo } from 'react'
import { Search, Filter, Star, MapPin, MessageCircle, Users, Video, Plus, TrendingUp, Grid3X3, List, Shield, Zap, ChevronRight } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { BottomNavBar } from '@/components/BottomNavBar'
import { BrandInput } from '@/components/ui/brand-input'
import { BrandButton } from '@/components/ui/brand-button'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StarRating } from '@/components/ui/star-rating'
import { RatingDialog } from '@/components/ui/rating-dialog'
import { useExpertRatings } from '@/hooks/useExpertRatings'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import ProfilePreview from '@/components/ProfilePreview'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ClassCard } from '@/components/ClassCard'
import { CreateClassDialog } from '@/components/CreateClassDialog'
import { useExpertClasses } from '@/hooks/useExpertClasses'
import { Skeleton } from '@/components/ui/skeleton'
import { usePersonalizedExperts, PersonalizedExpert } from '@/hooks/usePersonalizedDiscovery'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { BookmarkButton } from '@/components/BookmarkButton'
import { MarketplaceExplainer } from '@/components/MarketplaceExplainer'
import { Card, CardContent } from '@/components/ui/card'
import { ExpertCard } from '@/components/ExpertCard'
import { FeaturedExperts } from '@/components/experts/FeaturedExperts'
import { CategoryChips } from '@/components/experts/CategoryChips'
import { ExpertFilters, SortOption } from '@/components/experts/ExpertFilters'
import { ExpertBoostDialog } from '@/components/experts/ExpertBoostDialog'
import { ExpertVerificationBanner } from '@/components/experts/ExpertVerificationBanner'
import { AIExpertCarousel } from '@/components/experts/AIExpertCarousel'

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
  const { profile } = useProfile()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const location = useLocation()
  const [stateFilter, setStateFilter] = useState('all')
  const [skillFilter, setSkillFilter] = useState('all')
  const [sortBy, setSortBy] = useState<SortOption>('relevance')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  
  const [profilePreview, setProfilePreview] = useState<{ isOpen: boolean; userId: string | null }>({ isOpen: false, userId: null })
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showBoostDialog, setShowBoostDialog] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [showExplainer, setShowExplainer] = useState(() => localStorage.getItem('hideExpertExplainer') !== 'true')
  const { liveClasses, upcomingClasses, featuredClasses, pastClasses, isLoading: classesLoading } = useExpertClasses()
  
  // Use personalized experts algorithm
  const { experts: personalizedExperts, loading } = usePersonalizedExperts(50)


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
    id: expert.user_id, // Use user_id as id since function returns user_id
    user_id: expert.user_id,
    full_name: expert.full_name,
    skill_category: expert.skill_category || 'General',
    years_experience: expert.years_experience || 0,
    location_state: expert.state_name || '',
    location_lga: expert.lga_name || '',
    location_area: expert.area || '',
    status: 'approved', // All returned experts are approved
    relevance_score: expert.relevance_score,
    is_premium: expert.is_premium,
    is_boosted: expert.is_boosted,
    profiles: {
      full_name: expert.full_name,
      bio: expert.bio || '',
      profession: expert.profession || expert.skill_category || 'Expert',
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

  // Calculate category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    experts.forEach(e => {
      counts[e.skill_category] = (counts[e.skill_category] || 0) + 1
    })
    return counts
  }, [experts])

  // Filter and sort experts
  const filteredExperts = useMemo(() => {
    let result = experts.filter(expert => {
      const matchesSearch = expert.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           expert.skill_category.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesState = !stateFilter || stateFilter === 'all' || expert.location_state === stateFilter
      const matchesSkill = !skillFilter || skillFilter === 'all' || expert.skill_category === skillFilter
      
      return matchesSearch && matchesState && matchesSkill
    })

    // Sort
    if (sortBy === 'rating') {
      result = result.sort((a, b) => (b.profiles?.average_rating || 0) - (a.profiles?.average_rating || 0))
    } else if (sortBy === 'experience') {
      result = result.sort((a, b) => b.years_experience - a.years_experience)
    }

    return result
  }, [experts, searchQuery, stateFilter, skillFilter, sortBy])

  const activeFiltersCount = [stateFilter !== 'all', verifiedOnly].filter(Boolean).length

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
            {/* Expert Verification Banner - Compact for experts */}
            {userProfile?.is_expert && (
              <ExpertVerificationBanner />
            )}

            {/* Apply as Expert CTA for non-experts */}
            {user && !userProfile?.is_expert && (
              <Card className="border-dashed border-primary/30 bg-primary/5">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium text-sm">Become an Expert</p>
                        <p className="text-xs text-muted-foreground">Offer your services & get clients</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => navigate('/expert-application')}>
                      Apply
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Explainer Card */}
            {showExplainer && (
              <MarketplaceExplainer 
                type="expert" 
                onDismiss={() => {
                  setShowExplainer(false)
                  localStorage.setItem('hideExpertExplainer', 'true')
                }}
              />
            )}

            {/* AI Expert Carousel */}
            <AIExpertCarousel 
              experts={personalizedExperts}
              userState={profile?.state_name}
              userProfession={profile?.profession}
              onProfileClick={(userId) => setProfilePreview({ isOpen: true, userId })}
            />

            {/* Featured Experts Carousel */}
            <FeaturedExperts 
              experts={experts.map(e => ({
                id: e.id,
                user_id: e.user_id,
                full_name: e.full_name,
                skill_category: e.skill_category,
                profile_picture_url: e.profiles?.profile_picture_url,
                average_rating: e.profiles?.average_rating || 0,
                rating_count: e.profiles?.rating_count || 0,
              }))}
              onProfileClick={(userId) => setProfilePreview({ isOpen: true, userId })}
            />

            {/* Category Chips */}
            <CategoryChips 
              selected={skillFilter} 
              onSelect={setSkillFilter}
              expertCounts={categoryCounts}
            />

            {/* Boost Button for Verified Experts Only */}
            {userProfile?.is_expert && userProfile?.verification_status === 'verified' && (
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="gap-2 border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                  onClick={() => setShowBoostDialog(true)}
                >
                  <Zap className="h-4 w-4" />
                  Boost My Profile
                </Button>
              </div>
            )}
            
            {/* Filters & View Toggle */}
            <div className="flex items-center justify-between gap-2">
              <ExpertFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                stateFilter={stateFilter}
                onStateChange={setStateFilter}
                sortBy={sortBy}
                onSortChange={setSortBy}
                verifiedOnly={verifiedOnly}
                onVerifiedChange={setVerifiedOnly}
                activeFiltersCount={activeFiltersCount}
              />
              <div className="flex gap-1 shrink-0">
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
              </div>
            </div>

        {/* Experts Grid/List */}
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
          <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 gap-4' : 'space-y-3'}>
            {filteredExperts.map((expert) => (
              <ExpertCard
                key={expert.id}
                expert={expert}
                viewMode={viewMode}
                onProfileClick={(userId) => setProfilePreview({ isOpen: true, userId })}
              />
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

      <BottomNavBar />

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

      {/* Expert Boost Dialog */}
      <ExpertBoostDialog
        open={showBoostDialog}
        onOpenChange={setShowBoostDialog}
      />
    </div>
  )
}

export default Experts