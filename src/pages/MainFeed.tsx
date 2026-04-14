import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react'
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
import { useRoleFeatures } from '@/hooks/useRoleFeatures'
import { BottomNavBar } from '@/components/BottomNavBar'
import LinkedInPostCard from '@/components/LinkedInPostCard'
import StoriesSection from '@/components/StoriesSection'
import { usePersonalizedFeed } from '@/hooks/usePersonalizedFeed'
import EnhancedCreatePostDialog from '@/components/EnhancedCreatePostDialog'
import CreateStoryDialog from '@/components/CreateStoryDialog'
import ResponsiveLayout from '@/components/ResponsiveLayout'
import NotificationBell from '@/components/NotificationBell'
import ProfileCompletionDialog from '@/components/ProfileCompletionDialog'
import { useProfileCompletion } from '@/hooks/useProfileCompletion'

import { UnifiedSearchBar } from '@/components/UnifiedSearchBar'
import { NCConverter } from '@/components/NCConverter'
import { BannerAd } from '@/components/ads/BannerAd'
import { FeedAd } from '@/components/ads/FeedAd'
import { supabase } from '@/integrations/supabase/client'
import { FeedSkeleton } from '@/components/FeedSkeleton'
import CreatePostBar from '@/components/CreatePostBar'

// Lazy-load heavy below-fold components
const TrendingSection = lazy(() => import('@/components/TrendingSection'))
const SuggestionsTab = lazy(() => import('@/components/SuggestionsTab'))
const JobApplicationDialog = lazy(() => import('@/components/JobApplicationDialog'))
const ProfilePreview = lazy(() => import('@/components/ProfilePreview'))
const SmartJobRecommendations = lazy(() => import('@/components/SmartJobRecommendations'))
const UserModePrompt = lazy(() => import('@/components/UserModePrompt'))

const DepositDialog = lazy(() => import('@/components/DepositDialog').then(m => ({ default: m.DepositDialog })))
const EscrowSearchDialog = lazy(() => import('@/components/EscrowSearchDialog').then(m => ({ default: m.EscrowSearchDialog })))
const NCConverterDialog = lazy(() => import('@/components/miniapps/NCConverterDialog').then(m => ({ default: m.NCConverterDialog })))
const PlatformRatingDialog = lazy(() => import('@/components/PlatformRatingDialog').then(m => ({ default: m.PlatformRatingDialog })))
const QuickOnboarding = lazy(() => import('@/components/QuickOnboarding').then(m => ({ default: m.QuickOnboarding })))

const MainFeed = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading: authLoading } = useAuth()
  const { profile } = useProfile()
  const { bottomNavItems: roleBasedNavItems, isFreelancer, isClient } = useRoleFeatures()
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
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showDepositDialog, setShowDepositDialog] = useState(false)
  const [showEscrowSearch, setShowEscrowSearch] = useState(false)
  const [showNCConverter, setShowNCConverter] = useState(false)
  const [showRatingDialog, setShowRatingDialog] = useState(false)

  // Check if user should see the platform rating prompt
  useEffect(() => {
    if (!user || !profile) return
    const p = profile as any

    // Quick localStorage gate — avoids any async work if already rated/skipped
    if (localStorage.getItem('platform_rated') === 'true') return

    const localSkip = localStorage.getItem('rating_skipped_at')
    if (localSkip) {
      const skippedAt = new Date(localSkip).getTime()
      if (Date.now() - skippedAt < 30 * 24 * 60 * 60 * 1000) return
    }

    // Check DB to see if user already submitted a rating
    const checkRating = async () => {
      try {
        const { data } = await supabase
          .from('platform_ratings' as any)
          .select('id')
          .eq('user_id', user.id)
          .limit(1) as any
        if (data && data.length > 0) {
          localStorage.setItem('platform_rated', 'true')
          return
        }
      } catch {
        // If table doesn't exist or query fails, skip silently
      }

      // Show if user has some activity
      const hasActivity = (p.completed_jobs_count > 0) || (p.total_earnings > 0) || (p.wallet_balance > 0)
      if (hasActivity) {
        const timer = setTimeout(() => setShowRatingDialog(true), 3000)
        return () => clearTimeout(timer)
      }
    }
    checkRating()
  }, [user, profile])


  // Check for onboarding
  useEffect(() => {
    if (profile && user) {
      const p = profile as any
      if (p.onboarding_completed === false && !p.full_name) {
        setShowOnboarding(true)
      }
    }
  }, [profile, user])

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
    refreshFeed()
  }

  const handleOnboardingSkip = async () => {
    if (user) {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('user_id', user.id)
    }
    setShowOnboarding(false)
  }

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

  // ✅ NEW: MiniPay users see content IMMEDIATELY - no blocking at all
  // Wallet connection happens in background, protected actions trigger auth when needed
  // This eliminates the "Setting up your account..." infinite loop

  // Show skeleton only when auth is ready AND feed is actually fetching
  // Never show skeleton indefinitely when auth hasn't resolved
  if (authLoading || (loading && user)) {
    return <FeedSkeleton />
  }

  return (
    <>
    <ResponsiveLayout className="pb-20 pt-12">
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


          {/* Stories Section */}
          <StoriesSection
            stories={stories}
            onCreateStory={handleCreateStory}
            onViewStory={viewStory}
            currentUserId={user?.id}
          />

          {/* Create Post Bar */}
          <CreatePostBar
            profilePictureUrl={profile?.profile_picture_url}
            fullName={profile?.full_name}
            onCreatePost={() => setShowCreatePost(true)}
          />

          {/* Feed Toggle */}
          <div className="bg-card border-b border-border">
            <div className="flex">
              <button
                onClick={() => setFeedType('for-you')}
                className={`flex-1 py-3 text-sm font-medium transition-all border-b-2 ${
                  feedType === 'for-you' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                For You
              </button>
              <button
                onClick={() => setFeedType('following')}
                className={`flex-1 py-3 text-sm font-medium transition-all border-b-2 ${
                  feedType === 'following' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Discover
              </button>
            </div>
          </div>

          <Suspense fallback={null}>
            <div className="px-4 py-3">
              <SmartJobRecommendations maxItems={5} showGigs={true} />
            </div>
          </Suspense>

          {/* Banner Ad - Top of Feed */}
          <div className="px-4 py-3">
            <BannerAd />
          </div>

          {/* Main Feed */}
          {feedType === 'for-you' ? (
            <div className="divide-y divide-border">
              {filteredAndSortedPosts.length === 0 ? (
                <div className="py-20 text-center px-6">
                  <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                    <FileText className="h-10 w-10 text-primary/60" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">No posts to show</h3>
                  <p className="text-muted-foreground text-sm mb-6 max-w-[240px] mx-auto">
                    {selectedCategory !== 'all' 
                      ? `No ${selectedCategory} posts found. Try a different filter.`
                      : 'Your feed is empty. Start by sharing something or connecting with others!'}
                  </p>
                  <BrandButton onClick={() => setShowCreatePost(true)} className="px-6">
                    <Plus className="h-4 w-4 mr-2" />
                    Create a Post
                  </BrandButton>
                </div>
              ) : (
                <>
                  {filteredAndSortedPosts.map((post, index) => (
                    <React.Fragment key={post.id}>
                      <LinkedInPostCard
                        post={post as any}
                        onReact={handleReact}
                        onRemoveReaction={handleRemoveReaction}
                        onComment={addComment}
                        onJobApply={handleJobApply}
                        onProfileClick={handleProfileClick}
                        currentUserId={user?.id}
                      />
                      {/* Show in-feed ad after every 5 posts */}
                      {(index + 1) % 5 === 0 && (
                        <div className="p-4 bg-muted/20">
                          <FeedAd index={Math.floor(index / 5)} />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                  <div className="py-10 text-center bg-gradient-to-b from-transparent to-muted/20">
                    <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                      <RefreshCw className="h-5 w-5 text-primary/50" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">You're all caught up! ✨</span>
                    <p className="text-xs text-muted-foreground/60 mt-1">Check back later for new posts</p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading suggestions...</div>}>
              <div className="p-4">
                <SuggestionsTab />
              </div>
            </Suspense>
          )}
        </div>

        {/* Trending Sidebar - Hidden on smaller screens */}
        <div className="hidden xl:block xl:w-80 xl:ml-6">
          <div className="sticky top-24 px-6">
            <Suspense fallback={null}>
              <TrendingSection 
                onHashtagClick={setSearchQuery}
                onCategoryFilter={setSelectedCategory}
              />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Create Post Dialog */}
      <EnhancedCreatePostDialog
        isOpen={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        onCreatePost={(content, contentType, visibility, title, mediaUrls) => {
          return createPost(content, contentType, visibility, title, mediaUrls)
        }}
        userProfile={profile}
      />

      {/* Create Story Dialog */}
      <CreateStoryDialog
        isOpen={showCreateStory}
        onClose={() => setShowCreateStory(false)}
        onStoryCreated={handleStoryCreated}
      />

      <Suspense fallback={null}>
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

        {/* Crypto Deposit Dialog */}
        <DepositDialog open={showDepositDialog} onOpenChange={setShowDepositDialog} />
        <EscrowSearchDialog open={showEscrowSearch} onOpenChange={setShowEscrowSearch} />
        <NCConverterDialog open={showNCConverter} onClose={() => setShowNCConverter(false)} />
      </Suspense>

      <BottomNavBar />
    </ResponsiveLayout>
      
      {/* Profile Completion Dialog */}
      <ProfileCompletionDialog 
        isOpen={shouldShowDialog}
        missingFields={missingFields}
        onDismiss={() => {}}
      />

      <Suspense fallback={null}>
        {/* Quick Onboarding for new users */}
        <QuickOnboarding
          open={showOnboarding}
          onOpenChange={setShowOnboarding}
          onComplete={handleOnboardingComplete}
        />

        {/* User Mode Prompt for existing users without mode set */}
        <UserModePrompt />

        {/* Platform Rating Dialog */}
        <PlatformRatingDialog 
          open={showRatingDialog} 
          onOpenChange={setShowRatingDialog} 
        />
      </Suspense>

    </>
  )
}

export default MainFeed