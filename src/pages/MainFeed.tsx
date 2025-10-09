import React, { useState, useEffect } from 'react'
import { Plus, Search, Filter, TrendingUp, Home, MessageCircle, Users, DollarSign, User, Image, FileText, Briefcase, Award, Calendar, Vote, Hash, RefreshCw, ArrowRight, Star, MapPin, MoreVertical, Settings, Wallet } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { BrandInput } from '@/components/ui/brand-input'
import { BrandButton } from '@/components/ui/brand-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useEnhancedFeed } from '@/hooks/useEnhancedFeed'
import { useSuggestions } from '@/hooks/useSuggestions'
import InfiniteScrollFeed from '@/components/InfiniteScrollFeed'
import EnhancedCreatePostDialog from '@/components/EnhancedCreatePostDialog'
import CreateStoryDialog from '@/components/CreateStoryDialog'
import TrendingSection from '@/components/TrendingSection'
import ResponsiveLayout from '@/components/ResponsiveLayout'
import NotificationBell from '@/components/NotificationBell'
import SuggestionsTab from '@/components/SuggestionsTab'
import StoriesCarousel from '@/components/StoriesCarousel'
import JobApplicationDialog from '@/components/JobApplicationDialog'
import ProfilePreview from '@/components/ProfilePreview'
import TopBannerAd from '@/components/TopBannerAd'
import ProfileCompletionDialog from '@/components/ProfileCompletionDialog'
import { useProfileCompletion } from '@/hooks/useProfileCompletion'

const MainFeed = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile } = useProfile()
  const { isComplete, missingFields, shouldShowDialog } = useProfileCompletion()
  const { 
    posts, 
    loading, 
    searchQuery,
    setSearchQuery,
    createPost, 
    addReaction,
    removeReaction,
    addComment,
    refetch: refetchFeed
  } = useEnhancedFeed()
  const { 
    groupSuggestions, 
    expertSuggestions,
    loading: suggestionsLoading,
    refreshSuggestions 
  } = useSuggestions()
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [showCreateStory, setShowCreateStory] = useState(false)
  const [feedType, setFeedType] = useState<'for-you' | 'following'>('for-you')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'trending' | 'popular'>('recent')
  const [showFilters, setShowFilters] = useState(false)
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false)
  const [jobApplicationDialog, setJobApplicationDialog] = useState<{ isOpen: boolean; jobPost: any | null }>({ isOpen: false, jobPost: null })
  const [profilePreview, setProfilePreview] = useState<{ isOpen: boolean; userId: string | null }>({ isOpen: false, userId: null })
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullStartY, setPullStartY] = useState(0)

  const feedSuggestions = [
    "How do I create an engaging post?",
    "What type of content gets more likes?",
    "How can I use hashtags effectively?",
    "How do I connect with other professionals?",
    "What are the best practices for job posts?"
  ]

  const handleAskAI = (question: string) => {
    // This would trigger the main AI assistant with the specific question
    setAiAssistantOpen(true)
    console.log('AI Help requested:', question)
  }

  const bottomNavItems = [
    { icon: Home, label: 'Feed', path: '/feed', active: true },
    { icon: MessageCircle, label: 'Chat', path: '/chat' },
    { icon: Users, label: 'Expert', path: '/experts' },
    { icon: Briefcase, label: 'Gig', path: '/jobs' },
    { icon: DollarSign, label: 'Earn', path: '/earn', className: 'text-brand-green' },
    { icon: User, label: 'Profile', path: '/profile' }
  ]

  const postCategories = [
    { id: 'all', label: 'All Posts', icon: FileText },
    { id: 'job', label: 'Jobs', icon: Briefcase },
    { id: 'achievement', label: 'Achievements', icon: Award },
    { id: 'event', label: 'Events', icon: Calendar },
    { id: 'poll', label: 'Polls', icon: Vote },
    { id: 'status', label: 'Updates', icon: MessageCircle }
  ]

  const trendingHashtags = ['#NaijaLancers', '#Freelance', '#Jobs', '#Tech', '#Design', '#Remote']

  const filteredAndSortedPosts = React.useMemo(() => {
    let filtered = posts
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(post => post.content_type === selectedCategory)
    }
    
    // Sort posts
    switch (sortBy) {
      case 'trending':
        filtered = [...filtered].sort((a, b) => {
          const aEngagement = (a.likes_count + a.comments_count + a.shares_count)
          const bEngagement = (b.likes_count + b.comments_count + b.shares_count)
          return bEngagement - aEngagement
        })
        break
      case 'popular':
        filtered = [...filtered].sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
        break
      default: // recent
        filtered = [...filtered].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
    }
    
    return filtered
  }, [posts, selectedCategory, sortBy])

  const handleCreateStory = () => {
    setShowCreateStory(true)
  }

  const handleStoryCreated = () => {
    // Refresh feed when a new story is created
    refetchFeed()
  }

  const handleJobApply = (jobPost: any) => {
    setJobApplicationDialog({ isOpen: true, jobPost })
  }

  const handleProfileClick = (userId: string) => {
    setProfilePreview({ isOpen: true, userId })
  }

  // Pull to refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setPullStartY(e.touches[0].clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY
    const pullDistance = currentY - pullStartY
    
    if (pullDistance > 100 && window.scrollY === 0 && !isRefreshing) {
      handleRefresh()
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([refetchFeed(), refreshSuggestions()])
    setTimeout(() => setIsRefreshing(false), 500)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-20">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading feed...</p>
        </div>
      </div>
    )
  }

  return (
    <>
    <ResponsiveLayout className="pb-20">
      {/* Pull to Refresh Indicator */}
      {isRefreshing && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-primary text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-in slide-in-from-top">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm font-medium">Refreshing...</span>
        </div>
      )}
      
      {/* Top Banner Ad */}
      <TopBannerAd />
      
      <div 
        className="flex"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        {/* Main Content */}
        <div className="flex-1 max-w-4xl mx-auto">
          {/* Header */}
          <header className="bg-background/95 backdrop-blur-sm border-b border-border px-4 sm:px-6 py-4 sticky top-[60px] z-10">
            <div className="flex items-center justify-between mb-4">
              <Logo />
              <div className="flex items-center gap-2">
                <NotificationBell />
                
                {/* Profile Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {!isComplete && (
                      <DropdownMenuItem onClick={() => navigate('/profile')} className="bg-orange-50 dark:bg-orange-950">
                        <User className="mr-2 h-4 w-4 text-orange-600" />
                        <div className="flex-1">
                          <div className="font-medium text-orange-600">Complete Profile</div>
                          <div className="text-xs text-orange-600/70">{missingFields.length} fields missing</div>
                        </div>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      <User className="mr-2 h-4 w-4" />
                      My Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/settings')}>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/earn')}>
                      <Wallet className="mr-2 h-4 w-4" />
                      Wallet & Earnings
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            {/* Feed Toggle */}
            <div className="flex bg-muted p-1 rounded-full mb-4">
              <button
                onClick={() => setFeedType('for-you')}
                className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-colors ${
                  feedType === 'for-you' 
                    ? 'bg-primary text-white' 
                    : 'text-text-secondary hover:text-primary'
                }`}
              >
                Recommended
              </button>
              <button
                onClick={() => setFeedType('following')}
                className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-colors ${
                  feedType === 'following' 
                    ? 'bg-primary text-white' 
                    : 'text-text-secondary hover:text-primary'
                }`}
              >
                Suggestions
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <BrandInput
                placeholder="Search posts, experts, jobs, or hashtags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-12 h-12"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 h-8 w-8"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="mt-3 p-3 bg-muted rounded-xl space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-text-primary mb-2">Sort by</h4>
                  <div className="flex gap-2">
                    {(['recent', 'trending', 'popular'] as const).map((sort) => (
                      <Button
                        key={sort}
                        variant={sortBy === sort ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSortBy(sort)}
                        className="capitalize"
                      >
                        {sort === 'trending' && <TrendingUp className="h-4 w-4 mr-1" />}
                        {sort}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-text-primary mb-2">Categories</h4>
                  <div className="flex flex-wrap gap-2">
                    {postCategories.map((category) => (
                      <Button
                        key={category.id}
                        variant={selectedCategory === category.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedCategory(category.id)}
                        className="text-xs"
                      >
                        <category.icon className="h-4 w-4 mr-1" />
                        {category.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Trending Hashtags */}
            <div className="mt-3">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-text-primary">Trending</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {trendingHashtags.map((tag) => (
                  <Badge 
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary hover:text-white transition-colors"
                    onClick={() => setSearchQuery(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </header>

          {/* Stories Section */}
          <div className="border-b border-border">
            <StoriesCarousel onCreateStory={handleCreateStory} />
          </div>

          {/* Post Creation Bar */}
          <div className="px-4 sm:px-6 py-6 border-b border-border bg-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {profile?.full_name?.charAt(0) || 'U'}
              </div>
              <button
                onClick={() => setShowCreatePost(true)}
                className="flex-1 text-left px-4 py-3 bg-muted rounded-full text-text-secondary hover:bg-accent transition-colors text-sm border border-transparent hover:border-border"
              >
                Share your thoughts...
              </button>
            </div>
            
            {/* Quick Action Buttons - Hidden on mobile to save space */}
            <div className="hidden sm:flex justify-around mt-4 pt-4 border-t border-border">
              <button
                onClick={() => setShowCreatePost(true)}
                className="flex items-center gap-2 px-4 py-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-xl transition-colors"
              >
                <Image className="h-5 w-5" />
                <span className="font-medium">Photo/Video</span>
              </button>
              
              <button
                onClick={() => setShowCreatePost(true)}
                className="flex items-center gap-2 px-4 py-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-xl transition-colors"
              >
                <FileText className="h-5 w-5" />
                <span className="font-medium">Document</span>
              </button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-4 py-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-xl transition-colors">
                    <Plus className="h-5 w-5" />
                    <span className="font-medium">More</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate('/post-job')}>
                    <Briefcase className="h-4 w-4 mr-2" />
                    Post Job
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowCreatePost(true)}>
                    <Award className="h-4 w-4 mr-2" />
                    Share Achievement
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowCreatePost(true)}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Create Event
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowCreatePost(true)}>
                    <Vote className="h-4 w-4 mr-2" />
                    Start Poll
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Main Feed Content */}
          <div className="px-4 sm:px-6 py-6 space-y-6">
            {feedType === 'following' ? (
              <SuggestionsTab />
            ) : (
              <>
                {/* Groups You May Be Interested In */}
                {groupSuggestions.length > 0 && (
                  <Card className="overflow-hidden border-border">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                          <Users className="h-5 w-5 text-primary" />
                          Groups You May Be Interested In
                        </h3>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => navigate('/connections?tab=suggestions')}
                          className="text-primary hover:text-primary"
                        >
                          See all
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {groupSuggestions.slice(0, 4).map((group) => (
                          <div 
                            key={group.id}
                            className="p-4 bg-muted rounded-xl hover:bg-accent transition-colors cursor-pointer border border-transparent hover:border-primary/20"
                            onClick={() => navigate(`/group/${group.id}`)}
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Users className="h-6 w-6 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-text-primary truncate mb-1">
                                  {group.name}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-text-secondary mb-2">
                                  <MapPin className="h-3 w-3" />
                                  <span>{group.lga_name}, {group.state_name}</span>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  {group.member_count} members
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Expert Suggestions */}
                {expertSuggestions.length > 0 && (
                  <Card className="overflow-hidden border-border">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                          <Award className="h-5 w-5 text-primary" />
                          Expert Suggestions
                        </h3>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => navigate('/experts')}
                          className="text-primary hover:text-primary"
                        >
                          See all
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {expertSuggestions.slice(0, 4).map((expert) => (
                          <div 
                            key={expert.id}
                            className="p-4 bg-muted rounded-xl hover:bg-accent transition-colors cursor-pointer border border-transparent hover:border-primary/20"
                            onClick={() => handleProfileClick(expert.id)}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-12 w-12 border-2 border-primary/20">
                                <AvatarImage src={expert.profile_picture_url} alt={expert.full_name} />
                                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                  {expert.full_name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-text-primary truncate">
                                  {expert.full_name}
                                </h4>
                                <p className="text-sm text-text-secondary truncate mb-1">
                                  {expert.profession}
                                </p>
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                  <span className="text-xs font-medium text-text-primary">
                                    {expert.average_rating.toFixed(1)}
                                  </span>
                                  <span className="text-xs text-text-secondary">
                                    ({expert.rating_count})
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {filteredAndSortedPosts.length === 0 && !loading ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                      <FileText className="h-10 w-10 text-text-secondary" />
                    </div>
                    <h3 className="text-xl font-semibold text-text-primary mb-3">
                      {searchQuery ? 'No matching posts' : 'Welcome to your feed!'}
                    </h3>
                    <p className="text-text-secondary mb-6 max-w-md mx-auto">
                      {searchQuery 
                        ? 'Try adjusting your search terms or browse different categories'
                        : 'Start by creating your first post or connecting with other professionals'
                      }
                    </p>
                    {!searchQuery && (
                      <BrandButton onClick={() => setShowCreatePost(true)} size="lg">
                        <Plus className="h-5 w-5 mr-2" />
                        Create Your First Post
                      </BrandButton>
                    )}
                  </div>
                ) : (
                  <InfiniteScrollFeed
                      posts={filteredAndSortedPosts}
                      hasNextPage={false}
                      isFetchingNextPage={false}
                      fetchNextPage={() => {}}
                      onReact={addReaction}
                      onRemoveReaction={removeReaction}
                      onComment={addComment}
                      currentUserId={user?.id}
                      onJobApply={handleJobApply}
                      onProfileClick={handleProfileClick}
                    />
                )}
              </>
            )}
          </div>
        </div>

        {/* Trending Sidebar - Hidden on smaller screens */}
        <div className="hidden xl:block xl:w-80 xl:ml-6">
          <div className="sticky top-24 px-6">
            <TrendingSection 
              onHashtagClick={setSearchQuery}
              onCategoryFilter={setSelectedCategory}
            />
          </div>
        </div>
      </div>

      {/* Create Post Dialog */}
      <EnhancedCreatePostDialog
        isOpen={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        onCreatePost={(content, contentType, visibility, title, mediaUrls) => 
          createPost(content, contentType, visibility, title, mediaUrls)
        }
        userProfile={profile}
      />

      {/* Create Story Dialog */}
      <CreateStoryDialog
        isOpen={showCreateStory}
        onClose={() => setShowCreateStory(false)}
        onStoryCreated={handleStoryCreated}
      />

      {/* Job Application Dialog */}
      <JobApplicationDialog
        isOpen={jobApplicationDialog.isOpen}
        onClose={() => setJobApplicationDialog({ isOpen: false, jobPost: null })}
        jobPost={jobApplicationDialog.jobPost}
      />

      {/* Profile Preview Dialog */}
      <ProfilePreview
        isOpen={profilePreview.isOpen}
        onClose={() => setProfilePreview({ isOpen: false, userId: null })}
        profileId={profilePreview.userId || ''}
      />

      {/* Bottom Navigation - Responsive design */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-2 sm:px-4 py-2">
        <div className="flex justify-around items-center max-w-md mx-auto">
          {bottomNavItems.map((item) => (
            <Link 
              key={item.label} 
              to={item.path}
              className={`flex flex-col items-center gap-1 py-2 px-2 sm:px-3 rounded-xl transition-colors min-w-0 ${
                item.active 
                  ? 'text-primary bg-primary/10' 
                  : item.className || 'text-text-secondary hover:text-primary hover:bg-primary/5'
              }`}
            >
              <item.icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="text-xs font-medium truncate">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </ResponsiveLayout>
      
      {/* Profile Completion Dialog */}
      <ProfileCompletionDialog 
        isOpen={shouldShowDialog}
        missingFields={missingFields}
      />
    </>
  )
}

export default MainFeed