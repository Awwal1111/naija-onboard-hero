import React, { useState } from 'react'
import { Search, Plus, Home, MessageCircle, Users, DollarSign, User, Image, FileText, Briefcase } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { BrandInput } from '@/components/ui/brand-input'
import { BrandButton } from '@/components/ui/brand-button'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useOptimizedFeed } from '@/hooks/useOptimizedFeed'
import ProfessionalStoriesSection from '@/components/ProfessionalStoriesSection'
import InfiniteScrollFeed from '@/components/InfiniteScrollFeed'
import CreatePostDialog from '@/components/CreatePostDialog'
import CreateStoryDialog from '@/components/CreateStoryDialog'

const MainFeed = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile } = useProfile()
  const { 
    posts, 
    stories, 
    loading, 
    hasNextPage, 
    isFetchingNextPage, 
    fetchNextPage,
    searchQuery,
    setSearchQuery,
    createPost, 
    createStory, 
    toggleLike, 
    addComment, 
    viewStory 
  } = useOptimizedFeed()
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [showCreateStory, setShowCreateStory] = useState(false)
  const [feedType, setFeedType] = useState<'for-you' | 'following'>('for-you')

  const bottomNavItems = [
    { icon: Home, label: 'Feed', path: '/feed', active: true },
    { icon: MessageCircle, label: 'Chat', path: '/chat' },
    { icon: Users, label: 'Expert', path: '/experts' },
    { icon: DollarSign, label: 'Earn', path: '/earn' },
    { icon: User, label: 'Profile', path: '/profile' }
  ]


  const handleCreateStory = () => {
    setShowCreateStory(true)
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
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-background border-b border-border px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <Logo />
          <h1 className="text-xl font-bold text-primary">NaijaLancers Feed</h1>
          <div className="w-8" />
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
            For You
          </button>
          <button
            onClick={() => setFeedType('following')}
            className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-colors ${
              feedType === 'following' 
                ? 'bg-primary text-white' 
                : 'text-text-secondary hover:text-primary'
            }`}
          >
            Following
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-text-secondary" />
          <BrandInput
            placeholder="Search experts, jobs, or people..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </header>

        {stories && (
          <ProfessionalStoriesSection 
            stories={stories}
            onCreateStory={handleCreateStory}
            onViewStory={viewStory}
            currentUserId={user?.id}
          />
        )}

      {/* Post Creation Bar */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
            {profile?.full_name?.charAt(0) || 'U'}
          </div>
          <button
            onClick={() => setShowCreatePost(true)}
            className="flex-1 text-left px-4 py-3 bg-muted rounded-full text-text-secondary hover:bg-accent transition-colors"
          >
            Share your thoughts or post a job...
          </button>
        </div>
        
        {/* Quick Action Buttons */}
        <div className="flex justify-around mt-4 pt-4 border-t border-border">
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
          
          <button
            onClick={() => navigate('/post-job')}
            className="flex items-center gap-2 px-4 py-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-xl transition-colors"
          >
            <Briefcase className="h-5 w-5" />
            <span className="font-medium">Offer/Job</span>
          </button>
        </div>
      </div>

      {/* Main Feed Content */}
      <div className="px-6 py-4">
        {posts.length === 0 && !loading ? (
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
          <InfiniteScrollFeed
            posts={posts}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
            onLike={toggleLike}
            onComment={addComment}
            currentUserId={user?.id}
          />
        )}
      </div>

      {/* Create Post Dialog */}
      <CreatePostDialog
        isOpen={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        onCreatePost={createPost}
        userProfile={profile}
      />

      {/* Create Story Dialog */}
      <CreateStoryDialog
        isOpen={showCreateStory}
        onClose={() => setShowCreateStory(false)}
        onStoryCreated={() => {
          setShowCreateStory(false)
          // Refresh stories if needed
        }}
      />

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

export default MainFeed