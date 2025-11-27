import React, { useState, useEffect } from 'react'
import { Plus, Search, Filter, TrendingUp, Home, MessageCircle, Users, DollarSign, User, Image, FileText, Briefcase, Award, Calendar, Vote, Hash, RefreshCw, ArrowRight, Star, MapPin, MoreVertical, Settings, Wallet } from 'lucide-react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
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
import PeopleYouMayKnow from '@/components/PeopleYouMayKnow'
import { MoreMenuDrawer } from '@/components/MoreMenuDrawer'
import { ConnectionRequestsPreview } from '@/components/ConnectionRequestsPreview'
import TelegramConnectCard from '@/components/TelegramConnectCard'

const MainFeed = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { profile } = useProfile()
  const { isComplete, missingFields, shouldShowDialog } = useProfileCompletion()
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
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
    { icon: Home, label: 'Feed', path: '/feed' },
    { icon: MessageCircle, label: 'Chat', path: '/chat' },
    { icon: Users, label: 'Expert', path: '/experts' },
    { icon: Briefcase, label: 'Gig', path: '/jobs' },
    { icon: DollarSign, label: 'Earn', path: '/earn' }
  ]

  const handleNavigation = (path: string) => {
    navigate(path)
  }

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
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-lg flex items-center gap-2 animate-in slide-in-from-top">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span className="text-base font-medium">Refreshing...</span>
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
        <div className="flex-1 max-w-4xl mx-auto w-full">
          {/* Header - Clean and Spacious */}
          <header className="bg-background/95 backdrop-blur-sm border-b border-border px-6 py-5 sticky top-0 z-10">
            <div className="flex items-center justify-between mb-6">
              <Logo />
              <div className="flex items-center gap-3">
                <NotificationBell />
                
                {/* Profile Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    {!isComplete && (
                      <DropdownMenuItem onClick={() => navigate('/profile')} className="bg-orange-50 dark:bg-orange-950 py-3">
                        <User className="mr-3 h-5 w-5 text-orange-600" />
                        <div className="flex-1">
                          <div className="font-medium text-orange-600">Complete Profile</div>
                          <div className="text-sm text-orange-600/70">{missingFields.length} fields missing</div>
                        </div>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => navigate('/profile')} className="py-3">
                      <User className="mr-3 h-5 w-5" />
                      <span className="text-base">My Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/settings')} className="py-3">
                      <Settings className="mr-3 h-5 w-5" />
                      <span className="text-base">Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/earn')} className="py-3">
                      <Wallet className="mr-3 h-5 w-5" />
                      <span className="text-base">Wallet & Earnings</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            {/* Feed Toggle - Prominent */}
            <div className="flex bg-muted p-1 rounded-full mb-6">
              <button
                onClick={() => setFeedType('for-you')}
                className={`flex-1 py-3 px-6 rounded-full text-base font-medium transition-all ${
                  feedType === 'for-you' 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Recommended
              </button>
              <button
                onClick={() => setFeedType('following')}
                className={`flex-1 py-3 px-6 rounded-full text-base font-medium transition-all ${
                  feedType === 'following' 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Suggestions
              </button>
            </div>

            {/* Search Bar - Clean */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <BrandInput
                placeholder="Search posts, people, or hashtags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-14 h-14 text-base"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-10 w-10"
              >
                <Filter className="h-5 w-5" />
              </Button>
            </div>

            {/* Filters - Collapsible */}
            {showFilters && (
              <div className="mt-4 p-4 bg-muted/50 rounded-xl space-y-4 animate-in slide-in-from-top">
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Sort by</h4>
                  <div className="flex gap-2">
                    {(['recent', 'trending', 'popular'] as const).map((sort) => (
                      <Button
                        key={sort}
                        variant={sortBy === sort ? 'default' : 'outline'}
                        size="default"
                        onClick={() => setSortBy(sort)}
                        className="capitalize text-sm"
                      >
                        {sort === 'trending' && <TrendingUp className="h-4 w-4 mr-2" />}
                        {sort}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Categories</h4>
                  <div className="flex flex-wrap gap-2">
                    {postCategories.map((category) => (
                      <Button
                        key={category.id}
                        variant={selectedCategory === category.id ? 'default' : 'outline'}
                        size="default"
                        onClick={() => setSelectedCategory(category.id)}
                        className="text-sm"
                      >
                        <category.icon className="h-4 w-4 mr-2" />
                        {category.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Trending Hashtags - Clean Display */}
            {!showFilters && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Hash className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Trending Now</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {trendingHashtags.map((tag) => (
                    <Badge 
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all text-sm px-3 py-1.5"
                      onClick={() => setSearchQuery(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </header>

          {/* Stories Section */}
          <div className="border-b border-border mb-6">
            <StoriesCarousel onCreateStory={handleCreateStory} />
          </div>

          {/* Post Creation Bar - Improved */}
          <div className="px-6 py-6 mb-6 border-b border-border bg-card">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={profile?.profile_picture_url} />
                <AvatarFallback className="bg-primary text-primary-foreground text-base font-bold">
                  {profile?.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => setShowCreatePost(true)}
                className="flex-1 text-left px-5 py-4 bg-muted rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-all text-base border border-transparent hover:border-border"
              >
                Share your thoughts...
              </button>
            </div>
            
            {/* Quick Action Buttons */}
            <div className="hidden sm:flex justify-around mt-6 pt-6 border-t border-border">
              <button
                onClick={() => setShowCreatePost(true)}
                className="flex items-center gap-3 px-5 py-3 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
              >
                <Image className="h-6 w-6" />
                <span className="font-medium text-base">Photo/Video</span>
              </button>
              
              <button
                onClick={() => setShowCreatePost(true)}
                className="flex items-center gap-3 px-5 py-3 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
              >
                <FileText className="h-6 w-6" />
                <span className="font-medium text-base">Document</span>
              </button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 px-5 py-3 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all">
                    <Plus className="h-6 w-6" />
                    <span className="font-medium text-base">More</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => navigate('/post-job')} className="py-3">
                    <Briefcase className="h-5 w-5 mr-3" />
                    <span className="text-base">Post Job</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowCreatePost(true)} className="py-3">
                    <Award className="h-5 w-5 mr-3" />
                    <span className="text-base">Share Achievement</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowCreatePost(true)} className="py-3">
                    <Calendar className="h-5 w-5 mr-3" />
                    <span className="text-base">Create Event</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowCreatePost(true)}>
                    <Vote className="h-4 w-4 mr-2" />
                    Start Poll
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Connection Requests Preview */}
          <div className="px-3 sm:px-6 py-3">
            <ConnectionRequestsPreview />
          </div>

          {/* Telegram Bot Connection */}
          <div className="px-3 sm:px-6 py-3">
            <TelegramConnectCard />
          </div>

          {/* Main Feed Content */}
          <div className="px-2 sm:px-6 py-3 sm:py-6 space-y-3 sm:space-y-6">
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

                {/* People You May Know */}
                <PeopleYouMayKnow onProfileClick={handleProfileClick} />

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
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border px-1 sm:px-4 py-1.5 sm:py-2 safe-area-bottom z-50">
        <div className="flex justify-around items-center max-w-md mx-auto">
          {bottomNavItems.map((item) => (
            <button 
              key={item.label} 
              onClick={() => handleNavigation(item.path)}
              className={`flex flex-col items-center gap-0.5 sm:gap-1 py-1.5 sm:py-2 px-1.5 sm:px-3 rounded-xl transition-colors min-w-0 flex-1 ${
                location.pathname === item.path
                  ? 'text-primary bg-primary/10' 
                  : 'text-text-secondary hover:text-primary hover:bg-primary/5'
              }`}
            >
              <item.icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="text-[10px] sm:text-xs font-medium truncate max-w-full">{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => setMoreMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 sm:gap-1 py-1.5 sm:py-2 px-1.5 sm:px-3 rounded-xl transition-colors min-w-0 flex-1 text-text-secondary hover:text-primary hover:bg-primary/5"
          >
            <svg className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="text-[10px] sm:text-xs font-medium truncate max-w-full">More</span>
          </button>
        </div>
      </div>
    </ResponsiveLayout>
      
      {/* Profile Completion Dialog */}
      <ProfileCompletionDialog 
        isOpen={shouldShowDialog}
        missingFields={missingFields}
      />
      
      {/* More Menu Drawer */}
      <MoreMenuDrawer open={moreMenuOpen} onOpenChange={setMoreMenuOpen} />
    </>
  )
}

export default MainFeed