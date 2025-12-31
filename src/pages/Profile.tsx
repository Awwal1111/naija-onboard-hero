import React, { useState, useEffect } from 'react'
import { Camera, Wallet, MoreVertical, Edit, Share, Settings, LogOut, Plus, ArrowLeft, Home, MessageCircle, Users, DollarSign, Phone, Mail, Award, Star, MapPin, Briefcase, UserPlus, Menu, Crown } from 'lucide-react'
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom'
import { MoreMenuDrawer } from '@/components/MoreMenuDrawer'
import { Logo } from '@/components/ui/logo'
import { BrandButton } from '@/components/ui/brand-button'
import { useProfile } from '@/hooks/useProfile'
import { useAuth } from '@/hooks/useAuth'
import { useFileUpload } from '@/hooks/useFileUpload'
import { useConnections } from '@/hooks/useConnections'
import { useProfileCompletion } from '@/hooks/useProfileCompletion'
import { useExpertRatings } from '@/hooks/useExpertRatings'
import { supabase } from '@/integrations/supabase/client'
import ImageViewer from '@/components/ImageViewer'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { BrandInput } from '@/components/ui/brand-input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import PortfolioSection from '@/components/PortfolioSection'
import SkillsSection from '@/components/SkillsSection'
import { SavedPostsSection } from '@/components/SavedPostsSection'
import { StarRating } from '@/components/ui/star-rating'
import { RatingDialog } from '@/components/ui/rating-dialog'
import { RatingBreakdown } from '@/components/ui/rating-breakdown'
import TelegramConnectCard from '@/components/TelegramConnectCard'
import { UserBadges } from '@/components/UserBadges'
import { EmailVerificationBanner } from '@/components/EmailVerificationBanner'
import { TrustScoreCard } from '@/components/TrustScoreDisplay'
import { calculateTrustScore } from '@/hooks/useTrustScore'
import { PremiumSubscriptionDialog } from '@/components/PremiumSubscriptionDialog'
import { PremiumContactButtons } from '@/components/PremiumContactButtons'
import { ProfileVideoIntro } from '@/components/premium/ProfileVideoIntro'
import { PortfolioVideos } from '@/components/premium/PortfolioVideos'
// ExpertVerificationSection moved to Experts page

const Profile = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { userId } = useParams() // Get userId from URL params
  const { profile: currentUserProfile, loading: currentUserLoading, updateProfile, refetch: refetchProfile } = useProfile()
  const { user } = useAuth()
  const { signOut } = useAuth()
  const { toast } = useToast()
  const { uploadFile, uploadProgress } = useFileUpload()
  const location = useLocation()
  const { connectionRequests, respondToConnectionRequest, fetchConnectionRequests, sendConnectionRequest, checkConnection } = useConnections()
  const { isComplete, missingFields } = useProfileCompletion()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [viewedUserProfile, setViewedUserProfile] = useState<any>(null)
  const [viewedUserLoading, setViewedUserLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false)
  const [postsCount, setPostsCount] = useState(0)
  const [premiumDialogOpen, setPremiumDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    full_name: '',
    bio: '',
    profession: '',
    phone_number: ''
  })

  // Determine which profile to show
  const isOwnProfile = !userId || userId === user?.id
  const profile = isOwnProfile ? currentUserProfile : viewedUserProfile
  const loading = isOwnProfile ? currentUserLoading : viewedUserLoading

  // Expert ratings hook
  const { ratings, loading: ratingsLoading, hasRated, submitRating, updateRating, deleteRating, refetch: refetchRatings } = useExpertRatings(userId || user?.id)

  // Fetch user email for own profile
  useEffect(() => {
    const fetchUserEmail = async () => {
      if (isOwnProfile && user) {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        setUserEmail(authUser?.email || null)
      }
    }
    fetchUserEmail()
  }, [isOwnProfile, user])

  // Fetch posts count
  useEffect(() => {
    const fetchPostsCount = async () => {
      if (profile?.user_id) {
        const { count } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.user_id)
        setPostsCount(count || 0)
      }
    }
    fetchPostsCount()
  }, [profile?.user_id])

  // Fetch other user's profile if viewing someone else
  useEffect(() => {
    const fetchOtherUserProfile = async () => {
      if (userId && userId !== user?.id) {
        setViewedUserLoading(true)
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .single()
          
          if (error) throw error
          setViewedUserProfile(data)
          
          // Check connection status
          const connected = await checkConnection(userId)
          setIsConnected(connected)
        } catch (error: any) {
          console.error('Error fetching profile:', error)
          toast({
            title: "Error",
            description: "Failed to load profile",
            variant: "destructive"
          })
        } finally {
          setViewedUserLoading(false)
        }
      }
    }
    
    fetchOtherUserProfile()
  }, [userId, user?.id])

  // Fetch connection requests on mount
  useEffect(() => {
    fetchConnectionRequests()
  }, [])

  // Auto-open edit dialog if ?edit=true is in URL
  useEffect(() => {
    if (searchParams.get('edit') === 'true' && profile) {
      handleEditProfile()
    }
  }, [searchParams, profile])

  // Refetch profile data when connections change
  useEffect(() => {
    if (user?.id) {
      // Set up realtime listener for connections
      const channel = supabase
        .channel('profile-connections')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'connections'
          },
          async (payload) => {
            console.log('Connection change detected:', payload)
            // Refetch the current profile to get updated count
            if (isOwnProfile) {
              const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', user.id)
                .single()
              
              if (data) {
                // Update the profile via the updateProfile method
                window.location.reload()
              }
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [user?.id, isOwnProfile])

  const handleConnectUser = async () => {
    if (userId) {
      await sendConnectionRequest(userId)
      const connected = await checkConnection(userId)
      setIsConnected(connected)
      // Refetch the viewed user's profile to update connection count
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
      if (data) {
        setViewedUserProfile(data)
      }
    }
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

  const handleEditProfile = () => {
    if (profile) {
      setEditForm({
        full_name: profile.full_name || '',
        bio: profile.bio || '',
        profession: profile.profession || '',
        phone_number: profile.phone_number || ''
      })
    }
    setIsEditDialogOpen(true)
  }

  const handleSaveProfile = async () => {
    const result = await updateProfile(editForm)
    if (result?.success) {
      setIsEditDialogOpen(false)
    }
  }

  const handleShare = async () => {
    const profileUrl = `${window.location.origin}/profile/${profile?.user_id}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile?.full_name || 'User'}'s NaijaLancers Profile`,
          text: `Check out my profile on NaijaLancers`,
          url: profileUrl
        })
      } catch (error) {
        console.log('Share cancelled')
      }
    } else {
      // Fallback - copy to clipboard
      await navigator.clipboard.writeText(profileUrl)
      toast({
        title: "Link Copied",
        description: "Profile link copied to clipboard"
      })
    }
  }

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `avatar.${fileExt}`
      
      const { url, error } = await uploadFile(file, 'profiles', fileName, { upsert: true })
      
      if (error || !url) {
        throw new Error(error || 'Upload failed')
      }

      // Update profile with new picture URL
      await updateProfile({ profile_picture_url: url })
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload profile picture",
        variant: "destructive"
      })
    }
  }

  const handleLogout = async () => {
    await signOut()
  }

  const handleContactPhone = () => {
    const phoneNumber = "08167140857"
    const whatsappUrl = `https://wa.me/234${phoneNumber.slice(1)}` // Convert to international format
    window.open(whatsappUrl, '_blank')
  }

  const handleContactEmail = () => {
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=support@naijalancers.name.ng&su=Contact%20NaijaLancers&body=Hello%20NaijaLancers%20Team,%0D%0A%0D%0A`
    window.open(gmailUrl, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      
      {/* Header */}
      <header className="bg-background border-b border-border px-6 py-5 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm bg-background/95">
        <button onClick={() => navigate('/feed')} className="p-2 hover:bg-accent rounded-full transition-colors">
          <ArrowLeft className="h-6 w-6 text-muted-foreground" />
        </button>
        <Logo />
        <div className="w-10" /> {/* Spacer */}
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Email Verification Banner for own profile */}
        {isOwnProfile && !(profile as any)?.email_verified && (
          <EmailVerificationBanner 
            email={userEmail || undefined}
            isVerified={(profile as any)?.email_verified}
            className="mb-4"
          />
        )}
        
        {/* Professional Profile Card - LinkedIn Style */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6 shadow-sm">
          {/* Cover/Banner Area */}
          <div className="h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5" />
          
          {/* Profile Info Section */}
          <div className="px-6 pb-6">
            {/* Avatar - Overlapping the banner */}
            <div className="flex items-end justify-between -mt-12 mb-4">
              <div className="relative">
                <button
                  onClick={() => profile?.profile_picture_url && setIsImageViewerOpen(true)}
                  className={`w-24 h-24 rounded-full p-1 transition-all ${
                    profile?.profile_picture_url 
                      ? 'bg-gradient-to-r from-primary via-primary/80 to-primary hover:scale-105' 
                      : 'bg-muted'
                  }`}
                >
                  <Avatar className="w-full h-full border-4 border-card">
                    <AvatarImage 
                      src={profile?.profile_picture_url} 
                      alt={profile?.full_name || 'Profile'}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                      {profile?.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </button>
                
                {isOwnProfile && (
                  <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground cursor-pointer hover:bg-primary/90 transition-colors shadow-md border-2 border-card z-10">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProfilePictureUpload}
                    />
                    <Camera className="h-4 w-4" />
                  </label>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2 mt-14">
                {isOwnProfile ? (
                  <>
                    <Button variant="outline" size="sm" onClick={handleEditProfile}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9">
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onClick={() => navigate('/earn')} className="py-2.5">
                          <Wallet className="mr-2 h-4 w-4" />
                          Wallet & Transactions
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleShare} className="py-2.5">
                          <Share className="mr-2 h-4 w-4" />
                          Share Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/settings')} className="py-2.5">
                          <Settings className="mr-2 h-4 w-4" />
                          Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleLogout} className="text-destructive py-2.5">
                          <LogOut className="mr-2 h-4 w-4" />
                          Log Out
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : (
                  <>
                    {!isConnected ? (
                      <Button onClick={handleConnectUser} size="sm">
                        <UserPlus className="h-4 w-4 mr-1" />
                        Connect
                      </Button>
                    ) : (
                      <Button variant="secondary" size="sm" disabled>
                        <Users className="h-4 w-4 mr-1" />
                        Connected
                      </Button>
                    )}
                    <Button onClick={() => navigate(`/chat/${userId}`)} size="sm" variant="outline">
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Message
                    </Button>
                  </>
                )}
              </div>
            </div>
            
            {/* Name & Title */}
            <div className="mb-4">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-xl font-bold text-foreground">
                  {profile?.full_name || 'Add your name'}
                </h1>
                <UserBadges 
                  badges={{
                    isExpert: profile?.is_expert,
                    emailVerified: (profile as any)?.email_verified,
                    phoneVerified: (profile as any)?.phone_verified,
                    faceVerified: (profile as any)?.face_verified,
                    averageRating: profile?.average_rating,
                    ratingCount: profile?.rating_count,
                    avgResponseTimeSeconds: (profile as any)?.avg_response_time_seconds
                  }}
                  size="sm"
                />
              </div>
              
              <p className="text-muted-foreground text-base">
                {profile?.profession || 'Add your profession'}
              </p>
              
              {/* Location & Status Badges */}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {(profile?.state_name || profile?.lga_name) && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {profile.lga_name}{profile.state_name && `, ${profile.state_name}`}
                  </span>
                )}
                {profile?.is_expert && (
                  <Badge variant="secondary" className="text-xs">
                    <Award className="h-3 w-3 mr-1" />
                    Expert
                  </Badge>
                )}
                {profile?.is_premium && (
                  <Badge className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30 text-xs">
                    <Crown className="h-3 w-3 mr-1" />
                    Premium
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Bio */}
            {profile?.bio && (
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {profile.bio}
              </p>
            )}
            
            {/* Stats Row */}
            <div className="flex items-center gap-6 pt-4 border-t border-border">
              <button 
                onClick={() => navigate('/connections')}
                className="text-center hover:text-primary transition-colors"
              >
                <span className="text-lg font-bold text-foreground">{profile?.connections_count || 0}</span>
                <span className="text-sm text-muted-foreground ml-1">connections</span>
              </button>
              <div className="text-center">
                <span className="text-lg font-bold text-foreground flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  {profile?.average_rating ? profile.average_rating.toFixed(1) : '0.0'}
                </span>
                <span className="text-sm text-muted-foreground">({profile?.rating_count || 0})</span>
              </div>
              {isOwnProfile && (
                <>
                  <div className="text-center">
                    <span className="text-lg font-bold text-primary">NC {profile?.wallet_balance?.toFixed(0) || '0'}</span>
                    <span className="text-sm text-muted-foreground ml-1">balance</span>
                  </div>
                  <div className="text-center">
                    <span className="text-lg font-bold text-foreground">{postsCount}</span>
                    <span className="text-sm text-muted-foreground ml-1">posts</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tabs Section - Compact */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-12 p-1 bg-card border border-border rounded-xl mb-4">
            <TabsTrigger value="overview" className="text-sm">Overview</TabsTrigger>
            {isOwnProfile && <TabsTrigger value="saved" className="text-sm">Saved</TabsTrigger>}
            <TabsTrigger value="skills" className="text-sm">Skills</TabsTrigger>
            <TabsTrigger value="portfolio" className="text-sm">Portfolio</TabsTrigger>
            {!isOwnProfile && <TabsTrigger value="reviews" className="text-sm">Reviews</TabsTrigger>}
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            {/* Trust Score Card */}
            {profile && (
              <TrustScoreCard
                trustScore={calculateTrustScore({
                  emailVerified: (profile as any)?.email_confirmed,
                  phoneVerified: (profile as any)?.phone_verified,
                  faceVerified: (profile as any)?.face_verified,
                  averageRating: profile?.average_rating,
                  ratingCount: profile?.rating_count,
                  createdAt: profile?.created_at,
                  avgResponseTimeSeconds: (profile as any)?.avg_response_time_seconds,
                  connectionsCount: profile?.connections_count,
                  isExpert: profile?.is_expert,
                })}
                showBreakdown={isOwnProfile}
              />
            )}
            
            {/* Connection Requests Section - Only show on own profile */}
            {isOwnProfile && connectionRequests.filter(req => req.requested_id === profile?.user_id && req.status === 'pending').length > 0 && (
              <Card className="border-border">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <UserPlus className="h-6 w-6 text-primary" />
                    Connection Requests
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {connectionRequests
                    .filter(req => req.requested_id === profile?.user_id && req.status === 'pending')
                    .map(request => (
                      <div key={request.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={request.requester_profile?.profile_picture_url} />
                            <AvatarFallback className="text-base">
                              {request.requester_profile?.full_name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-base font-semibold text-foreground">
                              {request.requester_profile?.full_name || 'User'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {request.requester_profile?.profession || 'Professional'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <Button
                            size="default"
                            onClick={async () => {
                              await respondToConnectionRequest(request.id, true)
                              fetchConnectionRequests()
                            }}
                          >
                            Accept
                          </Button>
                          <Button
                            size="default"
                            variant="outline"
                            onClick={async () => {
                              await respondToConnectionRequest(request.id, false)
                              fetchConnectionRequests()
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}

            {/* Expert Verification Section moved to /experts page */}

            {/* Premium Subscription Card - Only for own profile */}
            {isOwnProfile && (
              <Card className="mb-4 border-yellow-500/30 bg-gradient-to-r from-yellow-500/5 to-amber-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Crown className="h-5 w-5 text-yellow-500" />
                    Premium Profile
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {profile?.is_premium && profile?.premium_expires_at ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Your premium is active until{' '}
                        <span className="font-medium text-foreground">
                          {new Date(profile.premium_expires_at).toLocaleDateString()}
                        </span>
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPremiumDialogOpen(true)}
                        className="border-yellow-500/30 text-yellow-600 hover:bg-yellow-500/10"
                      >
                        Extend Subscription
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Get SMS & email notifications when clients message you. Only ₦2,000/month.
                      </p>
                      <Button
                        onClick={() => setPremiumDialogOpen(true)}
                        className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black"
                      >
                        <Crown className="h-4 w-4 mr-2" />
                        Go Premium
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Premium Contact Buttons - Show on other user's profile if they're premium */}
            {!isOwnProfile && profile?.is_premium && (
              <Card className="mb-4">
                <CardContent className="pt-4">
                  <PremiumContactButtons
                    phoneNumber={profile?.phone_number}
                    email={userEmail}
                    whatsappNumber={profile?.whatsapp_number}
                    googleMeetLink={profile?.google_meet_link}
                    facebookUrl={profile?.facebook_url}
                    isPremium={true}
                  />
                </CardContent>
              </Card>
            )}

            {/* Premium Video Features */}
            {profile?.is_expert && (
              <div className="space-y-6">
                <ProfileVideoIntro
                  userId={profile.user_id}
                  videoUrl={(profile as any)?.intro_video_url}
                  thumbnailUrl={(profile as any)?.intro_video_thumbnail}
                  isOwner={isOwnProfile}
                  isPremium={!!profile?.is_premium}
                  onUpdate={refetchProfile}
                />
                
                <PortfolioVideos
                  userId={profile.user_id}
                  videos={((profile as any)?.portfolio_videos as any[]) || []}
                  isOwner={isOwnProfile}
                  isPremium={!!profile?.is_premium}
                  onUpdate={refetchProfile}
                />
              </div>
            )}

            {/* Professional Action Buttons - Only for own profile */}
            {isOwnProfile && (
              <>
                {/* Telegram Connection Card */}
                <TelegramConnectCard />
                
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <BrandButton 
                    className="flex items-center justify-center gap-2" 
                    size="lg"
                    onClick={() => navigate(profile?.is_expert ? '/admin/dashboard' : '/expert-application')}
                  >
                    <Award className="h-4 w-4" />
                    {profile?.is_expert ? 'Admin Dashboard' : 'Apply Expert'}
                  </BrandButton>
                  
                  <BrandButton 
                    variant="outline"
                    className="flex items-center justify-center gap-2" 
                    size="lg"
                    onClick={() => navigate('/post-job')}
                  >
                    <Plus className="h-4 w-4" />
                    Post Job
                  </BrandButton>
                </div>
              </>
            )}

            {/* Contact Information - Only visible to owner or connections */}
            {(isOwnProfile || isConnected) && (profile?.phone_number || userEmail) && (
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {profile?.phone_number && (
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <Phone className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-text-secondary">Phone</p>
                        <p className="text-sm text-text-primary font-medium">{profile.phone_number}</p>
                      </div>
                    </div>
                  )}
                  {(isOwnProfile ? userEmail : profile?.email) && (
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <Mail className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-text-secondary">Email</p>
                        <p className="text-sm text-text-primary font-medium">
                          {isOwnProfile ? userEmail : profile?.email}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

          </TabsContent>

          {isOwnProfile && (
            <TabsContent value="saved" className="mt-6">
              <SavedPostsSection />
            </TabsContent>
          )}

          <TabsContent value="skills" className="mt-6">
            <SkillsSection userId={profile?.user_id} isOwnProfile={isOwnProfile} />
          </TabsContent>

          <TabsContent value="portfolio" className="mt-6">
            <PortfolioSection userId={profile?.user_id} isOwnProfile={isOwnProfile} />
          </TabsContent>

          <TabsContent value="reviews" className="mt-6 space-y-4">
            {/* Add Rating Button for others */}
            {!isOwnProfile && user && (
              <RatingDialog
                onSubmit={async (rating, comment) => {
                  const result = await submitRating(rating, comment)
                  if (result?.success) {
                    await refetchRatings()
                  }
                }}
                trigger={
                  <Button className="w-full" disabled={hasRated} size="lg">
                    <Star className="h-5 w-5 mr-2" />
                    {hasRated ? 'Already Rated' : 'Rate This Expert'}
                  </Button>
                }
                disabled={hasRated}
              />
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                  Expert Ratings & Reviews
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ratingsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-text-secondary">Loading ratings...</p>
                  </div>
                ) : ratings.length === 0 ? (
                  <div className="text-center py-8">
                    <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-text-primary mb-2">No ratings yet</h3>
                    <p className="text-text-secondary text-sm">
                      {isOwnProfile 
                        ? 'You haven\'t received any ratings yet' 
                        : 'Be the first to rate this expert!'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Rating Breakdown */}
                    <RatingBreakdown
                      ratings={[1, 2, 3, 4, 5].map(star => ({
                        rating: star,
                        count: ratings.filter((r: any) => r.rating === star).length
                      }))}
                      totalRatings={ratings.length}
                      averageRating={profile?.average_rating || 0}
                    />

                    {/* Individual Ratings */}
                    <div className="space-y-4 pt-4 border-t">
                      <h4 className="font-semibold text-text-primary">Recent Reviews</h4>
                      {ratings.map((rating: any) => {
                        const isOwnRating = rating.user_id === user?.id
                        const createdAt = new Date(rating.created_at)
                        const canEdit = isOwnRating && (Date.now() - createdAt.getTime()) < 24 * 60 * 60 * 1000
                        
                        return (
                          <div key={rating.id} className="p-4 bg-muted rounded-xl space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarFallback className="bg-primary text-white">
                                    {rating.profiles?.full_name?.charAt(0) || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-text-primary">
                                    {rating.profiles?.full_name || 'Anonymous'}
                                    {isOwnRating && <span className="text-xs text-primary ml-2">(You)</span>}
                                  </p>
                                  <StarRating rating={rating.rating} readonly size="sm" />
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-text-secondary">
                                  {createdAt.toLocaleDateString()}
                                </span>
                                {canEdit && (
                                  <div className="flex gap-1">
                                    <RatingDialog
                                      onSubmit={async (newRating, newComment) => {
                                        const result = await updateRating(rating.id, newRating, newComment)
                                        if (result?.success) {
                                          await refetchRatings()
                                        }
                                      }}
                                      trigger={
                                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                                          Edit
                                        </Button>
                                      }
                                      initialRating={rating.rating}
                                      initialComment={rating.comment}
                                    />
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-7 text-xs text-destructive hover:text-destructive"
                                      onClick={async () => {
                                        if (confirm('Are you sure you want to delete this rating?')) {
                                          const result = await deleteRating(rating.id)
                                          if (result?.success) {
                                            await refetchRatings()
                                          }
                                        }
                                      }}
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                            {rating.comment && (
                              <div className="mt-3 p-3 bg-background/50 rounded-lg border border-border/50">
                                <p className="text-sm text-foreground leading-relaxed">
                                  {rating.comment}
                                </p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <BrandInput
              label="Full Name"
              value={editForm.full_name}
              onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
              placeholder="Enter your full name"
            />
            <BrandInput
              label="Phone Number"
              value={editForm.phone_number}
              onChange={(e) => setEditForm(prev => ({ ...prev, phone_number: e.target.value }))}
              placeholder="Enter your phone number"
            />
            <BrandInput
              label="Profession"
              value={editForm.profession}
              onChange={(e) => setEditForm(prev => ({ ...prev, profession: e.target.value }))}
              placeholder="e.g., Freelance Designer"
            />
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">Bio</label>
              <textarea
                value={editForm.bio}
                onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell us about yourself..."
                className="flex min-h-[80px] w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="flex gap-3">
              <BrandButton variant="outline" className="flex-1" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </BrandButton>
              <BrandButton className="flex-1" onClick={handleSaveProfile}>
                Save Changes
              </BrandButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Viewer for Profile Picture */}
      {profile?.profile_picture_url && (
        <ImageViewer
          images={[profile.profile_picture_url]}
          isOpen={isImageViewerOpen}
          onClose={() => setIsImageViewerOpen(false)}
          initialIndex={0}
        />
      )}

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

      {/* Premium Subscription Dialog */}
      <PremiumSubscriptionDialog
        open={premiumDialogOpen}
        onOpenChange={setPremiumDialogOpen}
        currentBalance={currentUserProfile?.balance_withdrawable || currentUserProfile?.wallet_balance || 0}
        isPremium={currentUserProfile?.is_premium || false}
        premiumExpiresAt={currentUserProfile?.premium_expires_at}
        onSuccess={() => refetchProfile()}
      />
    </div>
  )
}

export default Profile