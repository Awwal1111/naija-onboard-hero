import React, { useState, useEffect } from 'react'
import { Plus, Home, MessageCircle, Users, DollarSign, User, FileText, Briefcase, Award, Calendar, Vote, Hash, RefreshCw, MoreVertical, Settings, Wallet, Camera } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { BrandButton } from '@/components/ui/brand-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import SocialFeed from '@/components/SocialFeed'
import SocialStoriesRow from '@/components/SocialStoriesRow'
import { usePersonalizedFeed } from '@/hooks/usePersonalizedFeed'
import EnhancedCreatePostDialog from '@/components/EnhancedCreatePostDialog'
import CreateStoryDialog from '@/components/CreateStoryDialog'
import TrendingSection from '@/components/TrendingSection'
import ResponsiveLayout from '@/components/ResponsiveLayout'
import NotificationBell from '@/components/NotificationBell'
import SuggestionsTab from '@/components/SuggestionsTab'
import JobApplicationDialog from '@/components/JobApplicationDialog'
import ProfilePreview from '@/components/ProfilePreview'
import ProfileCompletionDialog from '@/components/ProfileCompletionDialog'
import { useProfileCompletion } from '@/hooks/useProfileCompletion'
import { MoreMenuDrawer } from '@/components/MoreMenuDrawer'
import { UnifiedSearchBar } from '@/components/UnifiedSearchBar'
import { NCConverter } from '@/components/NCConverter'

const MainFeed = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { profile } = useProfile()
  const { isComplete, missingFields, shouldShowDialog } = useProfileCompletion()
  const { 
    posts, 
    stories,
    loading, 
    createPost, 
    toggleLike,
    addComment,
    viewStory,
    savePost,
    refreshFeed
  } = usePersonalizedFeed()
  const [searchQuery, setSearchQuery] = useState('')
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
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
    refreshFeed()
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
    await refreshFeed()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  const handleReact = (postId: string, reactionType: string) => {
    toggleLike(postId)
  }

  const handleRemoveReaction = (postId: string) => {
    toggleLike(postId)
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
      
      <div 
        className="flex"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
      {/* Main Content */}
        <div className="flex-1 max-w-4xl mx-auto w-full">
          {/* Header - Fixed at Top */}
          <header className="bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 sticky top-0 z-10">
            <div className="flex items-center justify-between gap-3">
              <Logo />
              <div className="flex-1 max-w-md hidden sm:block">
                <UnifiedSearchBar />
              </div>
              <div className="flex items-center gap-1">
                <NCConverter />
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
            {/* Mobile Search */}
            <div className="mt-3 sm:hidden">
              <UnifiedSearchBar />
            </div>
          </header>

          {/* Stories Row - Instagram Style */}
          <SocialStoriesRow
            stories={stories}
            onCreateStory={handleCreateStory}
            onViewStory={viewStory}
            currentUserId={user?.id}
            currentUserAvatar={profile?.profile_picture_url}
            currentUserName={profile?.full_name}
          />

          {/* Create Post Bar - Minimal */}
          <div className="bg-card px-4 py-3 border-b border-border">
            <button
              onClick={() => setShowCreatePost(true)}
              className="w-full flex items-center gap-3 py-2.5 px-4 bg-muted rounded-full hover:bg-muted/80 transition-colors"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.profile_picture_url} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                  {profile?.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground flex-1 text-left">What's on your mind?</span>
              <Camera className="h-5 w-5 text-primary" />
            </button>
          </div>

          {/* Feed Toggle */}
          <div className="bg-card px-4 py-2 border-b border-border">
            <div className="flex gap-1">
              <button
                onClick={() => setFeedType('for-you')}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                  feedType === 'for-you' 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                For You
              </button>
              <button
                onClick={() => setFeedType('following')}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                  feedType === 'following' 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                Discover
              </button>
            </div>
          </div>

          {/* Main Feed - Instagram/Facebook Style */}
          {feedType === 'for-you' ? (
            <SocialFeed
              posts={filteredAndSortedPosts as any}
              onLike={(postId) => toggleLike(postId)}
              onComment={addComment}
              onProfileClick={handleProfileClick}
              currentUserId={user?.id}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
            />
          ) : (
            <div className="px-4 py-4">
              <SuggestionsTab />
            </div>
          )}
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
        onCreatePost={(content, contentType, title, mediaUrls) => {
          const urlsArray = typeof mediaUrls === 'string' ? [mediaUrls] : mediaUrls
          return createPost(content, contentType, title, urlsArray)
        }}
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