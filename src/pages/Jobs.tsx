import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, MapPin, Clock, DollarSign, Users, Briefcase, Plus, Search, Eye, TrendingUp, Grid3X3, List, Package, Star, Zap, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BrandInput } from '@/components/ui/brand-input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { usePersonalizedJobPosts, usePersonalizedGigs } from '@/hooks/usePersonalizedDiscovery'
import { useSearchHistory } from '@/hooks/useSearchHistory'
import { supabase } from '@/integrations/supabase/client'
import { BottomNavBar } from '@/components/BottomNavBar'
import { BookmarkButton } from '@/components/BookmarkButton'
import { MarketplaceExplainer } from '@/components/MarketplaceExplainer'
import { CreateJobPostDialog } from '@/components/CreateJobPostDialog'
import { GigCategoryChips } from '@/components/gigs/GigCategoryChips'
import { AIGigCarousel } from '@/components/gigs/AIGigCarousel'
import { GigSortFilterBar, SortOption } from '@/components/gigs/GigSortFilterBar'
import { GigCardCompact } from '@/components/gigs/GigCardCompact'
import { getCategoryPlaceholder, normalizeCategory } from '@/lib/gigCategories'

const Jobs = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { profile } = useProfile()
  const { jobPosts, loading: jobsLoading } = usePersonalizedJobPosts(50)
  const { gigs, loading: gigsLoading } = usePersonalizedGigs(50)
  const { addSearch } = useSearchHistory()
  const [searchQuery, setSearchQuery] = useState('')
  const [stateFilter, setStateFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('gigs')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [myJobs, setMyJobs] = useState<any[]>([])
  const [myApplications, setMyApplications] = useState<any[]>([])
  const [stats, setStats] = useState({ posted: 0, applications: 0, views: 0 })
  const [showGigExplainer, setShowGigExplainer] = useState(() => {
    return localStorage.getItem('hideGigExplainer') !== 'true'
  })
  const [showJobExplainer, setShowJobExplainer] = useState(() => {
    return localStorage.getItem('hideJobExplainer') !== 'true'
  })
  const [showCreateJobDialog, setShowCreateJobDialog] = useState(false)
  
  // New filter states
  const [sortBy, setSortBy] = useState<SortOption>('relevance')
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null)
  const [expertOnly, setExpertOnly] = useState(false)

  useEffect(() => {
    if (user) {
      fetchMyData()
    }
  }, [user])

  const fetchMyData = async () => {
    const [jobsRes, appsRes] = await Promise.all([
      supabase.from('job_posts').select('*').eq('user_id', user?.id).order('created_at', { ascending: false }),
      supabase.from('job_post_applications').select('*, job_posts(*)').eq('applicant_id', user?.id).order('created_at', { ascending: false })
    ])
    setMyJobs(jobsRes.data || [])
    setMyApplications(appsRes.data || [])
    setStats({
      posted: jobsRes.data?.length || 0,
      applications: appsRes.data?.length || 0,
      views: jobsRes.data?.reduce((sum, j) => sum + (j.views_count || 0), 0) || 0
    })
  }

  const formatBudget = (min?: number, max?: number) => {
    if (!min && !max) return 'Budget not specified'
    if (min && max) return `₦${min.toLocaleString()} - ₦${max.toLocaleString()}`
    if (min) return `From ₦${min.toLocaleString()}`
    if (max) return `Up to ₦${max.toLocaleString()}`
  }

  // Calculate category counts for chips
  const gigCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    gigs.forEach((gig: any) => {
      const cat = normalizeCategory(gig.category)
      counts[cat] = (counts[cat] || 0) + 1
    })
    return counts
  }, [gigs])


  // Enhanced filtering with sorting and price range
  const filteredAndSortedGigs = useMemo(() => {
    let filtered = gigs.filter((gig: any) => {
      const matchesSearch = gig.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           gig.description?.toLowerCase().includes(searchQuery.toLowerCase())
      const normalizedGigCategory = normalizeCategory(gig.category)
      const matchesCategory = !categoryFilter || categoryFilter === 'all' || 
                             categoryFilter === 'All Categories' ||
                             normalizedGigCategory === categoryFilter
      const matchesPrice = !priceRange || (gig.price >= priceRange[0] && gig.price <= priceRange[1])
      const matchesExpert = !expertOnly || gig.seller_is_expert
      return matchesSearch && matchesCategory && matchesPrice && matchesExpert
    })

    // Sort results
    switch (sortBy) {
      case 'price_low':
        filtered.sort((a, b) => (a.price || 0) - (b.price || 0))
        break
      case 'price_high':
        filtered.sort((a, b) => (b.price || 0) - (a.price || 0))
        break
      case 'rating':
        filtered.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
        break
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        break
      case 'popular':
        filtered.sort((a, b) => (b.review_count || 0) - (a.review_count || 0))
        break
      default: // relevance - keep original order (already sorted by relevance_score)
        break
    }

    return filtered
  }, [gigs, searchQuery, categoryFilter, priceRange, expertOnly, sortBy])

  // Track search when user types and pauses
  useEffect(() => {
    if (searchQuery.length >= 3) {
      const timer = setTimeout(() => {
        addSearch(searchQuery, categoryFilter !== 'all' ? categoryFilter : undefined)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [searchQuery, categoryFilter, addSearch])

  const filteredJobs = jobPosts.filter((job: any) => {
    const matchesSearch = job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesState = !stateFilter || stateFilter === 'all' || job.location?.includes(stateFilter)
    const matchesCategory = !categoryFilter || categoryFilter === 'all' || 
                           categoryFilter === 'All Categories' ||
                           job.required_skills?.some((skill: string) => skill.toLowerCase().includes(categoryFilter.toLowerCase()))
    return matchesSearch && matchesState && matchesCategory
  })

  // Count active filters
  const activeFilterCount = [
    priceRange !== null,
    expertOnly,
    categoryFilter !== 'all'
  ].filter(Boolean).length

  const clearFilters = () => {
    setPriceRange(null)
    setExpertOnly(false)
    setCategoryFilter('all')
  }

  const loading = jobsLoading || gigsLoading

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">Marketplace</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-1.5 h-8 px-3">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Create</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate('/post-job')}>
                <Package className="h-4 w-4 mr-2" />
                Create Gig (Service)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowCreateJobDialog(true)}>
                <Briefcase className="h-4 w-4 mr-2" />
                Post a Job
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Search Bar */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <BrandInput
              placeholder="What service are you looking for?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="sticky top-[105px] z-10 bg-background border-b px-4">
            <div className="flex items-center justify-between">
              <TabsList className="h-10 bg-transparent p-0 gap-4">
                <TabsTrigger 
                  value="gigs" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2.5 px-0"
                >
                  <Package className="h-4 w-4 mr-1.5" />
                  Services
                </TabsTrigger>
                <TabsTrigger 
                  value="jobs"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2.5 px-0"
                >
                  <Briefcase className="h-4 w-4 mr-1.5" />
                  Jobs
                </TabsTrigger>
                <TabsTrigger 
                  value="my-posts"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2.5 px-0"
                >
                  <TrendingUp className="h-4 w-4 mr-1.5" />
                  My Posts
                </TabsTrigger>
              </TabsList>
              
              {activeTab === 'gigs' && (
                <div className="flex items-center gap-1">
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Category Filter Chips */}
          {activeTab === 'gigs' && (
            <GigCategoryChips
              selected={categoryFilter}
              onSelect={setCategoryFilter}
              gigCounts={gigCategoryCounts}
            />
          )}

          {/* Gigs Tab Content */}
          <TabsContent value="gigs" className="mt-0 px-4">
            {/* AI Recommendations Carousel */}
            <div className="pt-3">
              <AIGigCarousel 
                gigs={gigs} 
                userState={profile?.state_name}
                userProfession={profile?.profession}
                isPremium={profile?.is_premium}
              />
            </div>

            {/* Sort & Filter Bar */}
            <GigSortFilterBar
              sortBy={sortBy}
              onSortChange={setSortBy}
              priceRange={priceRange}
              onPriceRangeChange={setPriceRange}
              expertOnly={expertOnly}
              onExpertOnlyChange={setExpertOnly}
              activeFilterCount={activeFilterCount}
              onClearFilters={clearFilters}
              totalResults={filteredAndSortedGigs.length}
            />

            {/* Explainer Card */}
            {showGigExplainer && (
              <div className="pt-3">
                <MarketplaceExplainer 
                  type="gig" 
                  onDismiss={() => {
                    setShowGigExplainer(false)
                    localStorage.setItem('hideGigExplainer', 'true')
                  }}
                />
              </div>
            )}
            
            {filteredAndSortedGigs.length === 0 ? (
              <Card className="mt-4">
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No Services Found</h3>
                  <p className="text-sm text-muted-foreground mb-4">Try adjusting your filters</p>
                  <Button variant="outline" onClick={clearFilters} className="mr-2">
                    Clear Filters
                  </Button>
                  <Button onClick={() => navigate('/post-job')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Gig
                  </Button>
                </CardContent>
              </Card>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 py-3">
                {filteredAndSortedGigs.map((gig: any) => (
                  <GigCardCompact
                    key={gig.id}
                    id={gig.id}
                    title={gig.title}
                    price={gig.price}
                    category={gig.category}
                    photo_urls={gig.photo_urls}
                    seller_name={gig.seller_name}
                    seller_picture={gig.seller_picture}
                    seller_is_expert={gig.seller_is_expert}
                    seller_state={gig.seller_state}
                    average_rating={gig.average_rating}
                    review_count={gig.review_count}
                    boost_amount={gig.boost_amount}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2 py-3">
                {filteredAndSortedGigs.map((gig: any) => (
                  <Card 
                    key={gig.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/gig/${gig.id}`)}
                  >
                    <CardContent className="p-3 flex gap-3">
                      <div className="relative w-20 h-14 rounded-md overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={gig.photo_urls?.[0] && !gig.photo_urls[0].includes('placeholder') 
                            ? gig.photo_urls[0] 
                            : getCategoryPlaceholder(normalizeCategory(gig.category))}
                          alt={gig.title}
                          className="w-full h-full object-cover"
                        />
                        {(gig.boost_amount || 0) > 0 && (
                          <div className="absolute top-0.5 left-0.5">
                            <Badge className="bg-gradient-to-r from-orange-500 to-yellow-400 text-white text-[8px] h-4 px-1 gap-0 border-0">
                              <Zap className="h-2.5 w-2.5 fill-white" />
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium line-clamp-1">{gig.title}</h3>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-xs text-muted-foreground">{gig.seller_name}</span>
                          {gig.seller_state && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                <MapPin className="h-3 w-3" />
                                {gig.seller_state}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px]">{gig.category}</Badge>
                            {(gig.average_rating || gig.review_count > 0) && (
                              <div className="flex items-center gap-0.5">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                <span className="text-[10px]">{gig.average_rating?.toFixed(1) || 'New'}</span>
                              </div>
                            )}
                          </div>
                          <span className="text-sm font-bold text-primary">₦{gig.price?.toLocaleString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Jobs Tab Content */}
          <TabsContent value="jobs" className="mt-0 px-4 space-y-3 py-3">
            {/* Explainer Card */}
            {showJobExplainer && (
              <MarketplaceExplainer 
                type="job" 
                onDismiss={() => {
                  setShowJobExplainer(false)
                  localStorage.setItem('hideJobExplainer', 'true')
                }}
              />
            )}
            
            {filteredJobs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No Jobs Found</h3>
                  <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
                </CardContent>
              </Card>
            ) : (
              filteredJobs.map((job: any) => (
                <Card key={job.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm line-clamp-1">{job.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={job.poster_picture || undefined} />
                            <AvatarFallback className="text-[10px]">{job.poster_name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">{job.poster_name}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <BookmarkButton type="job" itemId={job.id} />
                        {user?.id !== job.user_id && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); navigate(`/chat/${job.user_id}`); }}>
                            Chat
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{job.description}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <Badge variant="secondary" className="gap-1 text-[10px]">
                        <DollarSign className="h-3 w-3" />
                        {formatBudget(job.budget_min, job.budget_max)}
                      </Badge>
                      {job.location && (
                        <Badge variant="outline" className="gap-1 text-[10px]">
                          <MapPin className="h-3 w-3" />
                          {job.location}
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 ml-auto">
                        <Clock className="h-3 w-3" />
                        {new Date(job.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* My Posts Tab Content */}
          <TabsContent value="my-posts" className="mt-0 px-4 space-y-4 py-3">
            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => navigate('/my-gigs')}
              >
                <Package className="h-4 w-4 mr-1.5" />
                Manage My Gigs
              </Button>
              <Button 
                size="sm" 
                className="flex-1"
                onClick={() => navigate('/post-job')}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Create New
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="py-3 text-center">
                  <div className="text-lg font-bold text-primary">{stats.posted}</div>
                  <div className="text-[10px] text-muted-foreground">Posted</div>
                </CardContent>
              </Card>
              <Card className="bg-blue-500/5 border-blue-500/20">
                <CardContent className="py-3 text-center">
                  <div className="text-lg font-bold text-blue-600">{stats.applications}</div>
                  <div className="text-[10px] text-muted-foreground">Applied</div>
                </CardContent>
              </Card>
              <Card className="bg-purple-500/5 border-purple-500/20">
                <CardContent className="py-3 text-center">
                  <div className="text-lg font-bold text-purple-600">{stats.views}</div>
                  <div className="text-[10px] text-muted-foreground">Views</div>
                </CardContent>
              </Card>
            </div>

            {myJobs.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center">
                  <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-semibold mb-1 text-sm">No Posts Yet</h3>
                  <p className="text-xs text-muted-foreground mb-3">Start offering services or posting jobs</p>
                  <Button size="sm" onClick={() => navigate('/post-job')}>
                    <Plus className="h-4 w-4 mr-1" />
                    Create Post
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {myJobs.map((job) => (
                  <Card key={job.id}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm line-clamp-1">{job.title}</h3>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Posted {new Date(job.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={job.status === 'open' ? 'default' : 'secondary'} className="text-[10px]">
                          {job.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {job.views_count || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {job.applications_count || 0}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <BottomNavBar />
      <CreateJobPostDialog 
        open={showCreateJobDialog} 
        onOpenChange={setShowCreateJobDialog}
        onSuccess={() => {}}
      />
    </div>
  )
}

export default Jobs