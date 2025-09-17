import React, { useState } from 'react'
import { Plus, Search, Filter, TrendingUp, Home, MessageCircle, Users, DollarSign, User, Image, FileText, Briefcase, Award, Calendar, Vote, Hash } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { BrandInput } from '@/components/ui/brand-input'
import { BrandButton } from '@/components/ui/brand-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useEnhancedFeed } from '@/hooks/useEnhancedFeed'
import InfiniteScrollFeed from '@/components/InfiniteScrollFeed'
import EnhancedCreatePostDialog from '@/components/EnhancedCreatePostDialog'
import TrendingSection from '@/components/TrendingSection'
import ResponsiveLayout from '@/components/ResponsiveLayout'
import NotificationBell from '@/components/NotificationBell'
import SuggestionsTab from '@/components/SuggestionsTab'
import StoriesCarousel from '@/components/StoriesCarousel'
import JobApplicationDialog from '@/components/JobApplicationDialog'
import ProfilePreview from '@/components/ProfilePreview'

const MainFeed = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile } = useProfile()
  const { 
    posts, 
    loading, 
    searchQuery,
    setSearchQuery,
    createPost, 
    addReaction,
    removeReaction,
    addComment
  } = useEnhancedFeed()
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [showCreateStory, setShowCreateStory] = useState(false)
  const [feedType, setFeedType] = useState<'for-you' | 'following'>('for-you')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'trending' | 'popular'>('recent')
  const [showFilters, setShowFilters] = useState(false)
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false)
  const [jobApplicationDialog, setJobApplicationDialog] = useState<{ isOpen: boolean; jobPost: any | null }>({ isOpen: false, jobPost: null })
  const [profilePreview, setProfilePreview] = useState<{ isOpen: boolean; userId: string | null }>({ isOpen: false, userId: null })

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
    { icon: DollarSign, label: 'Earn', path: '/earn' },
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

  const handleJobApply = (jobPost: any) => {
    setJobApplicationDialog({ isOpen: true, jobPost })
  }

  const handleProfileClick = (userId: string) => {
    setProfilePreview({ isOpen: true, userId })
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
    <ResponsiveLayout className="pb-20">
      <div className="flex">
        {/* Main Content */}
        <div className="flex-1 max-w-4xl mx-auto">
          {/* Header */}
          <header className="bg-background border-b border-border px-3 sm:px-6 py-4 sticky top-0 z-10">
            <div className="flex items-center justify-between mb-4">
              <Logo />
              <NotificationBell />
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
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-text-secondary" />
              <BrandInput
                placeholder="Search posts, experts, jobs, or hashtags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-12"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="absolute right-2 top-2 p-1 h-6 w-6"
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
          <div className="px-3 sm:px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm">
                {profile?.full_name?.charAt(0) || 'U'}
              </div>
              <button
                onClick={() => setShowCreatePost(true)}
                className="flex-1 text-left px-3 sm:px-4 py-2 sm:py-3 bg-muted rounded-full text-text-secondary hover:bg-accent transition-colors text-sm"
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
          <div className="px-3 sm:px-6 py-4">
            {feedType === 'following' ? (
              <SuggestionsTab />
            ) : (
              <>
                {filteredAndSortedPosts.length === 0 && !loading ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-8 w-8 text-text-secondary" />
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">
                      {searchQuery ? 'No matching posts' : 'Welcome to your feed!'}
                    </h3>
                    <p className="text-text-secondary mb-4">
                      {searchQuery 
                        ? 'Try adjusting your search terms'
                        : 'Start by creating your first post or following other users'
                      }
                    </p>
                    {!searchQuery && (
                      <BrandButton onClick={() => setShowCreatePost(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Post
                      </BrandButton>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Feed Stats */}
                    <div className="mb-4 flex items-center justify-between text-sm text-text-secondary">
                      <span>{filteredAndSortedPosts.length} posts</span>
                      <div className="flex items-center gap-2">
                        <span>Sorted by {sortBy}</span>
                        {selectedCategory !== 'all' && (
                          <Badge variant="outline" className="text-xs">
                            {postCategories.find(c => c.id === selectedCategory)?.label}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
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
                  </>
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
                  : 'text-text-secondary hover:text-primary hover:bg-primary/5'
              }`}
            >
              <item.icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="text-xs font-medium truncate">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </ResponsiveLayout>
  )
}

export default MainFeed