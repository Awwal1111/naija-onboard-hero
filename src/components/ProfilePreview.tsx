import React, { useState } from 'react'
import { User, Briefcase, MapPin, Eye, MessageCircle, UserPlus, CheckCircle } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'

interface ProfileInfo {
  id: string
  user_id: string
  full_name: string
  profession?: string
  bio?: string
  profile_picture_url?: string
  connections_count?: number
  is_expert?: boolean
  expert_verified_at?: string
  location?: string
  state_name?: string
  lga_name?: string
}

interface ProfilePreviewProps {
  isOpen: boolean
  onClose: () => void
  profileId: string
  onConnect?: (userId: string) => void
}

const ProfilePreview: React.FC<ProfilePreviewProps> = ({
  isOpen,
  onClose,
  profileId,
  onConnect
}) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [profile, setProfile] = useState<ProfileInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  React.useEffect(() => {
    if (isOpen && profileId) {
      fetchProfile()
    }
  }, [isOpen, profileId])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      // Fetch basic profile info (available to all authenticated users)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          full_name,
          profession,
          bio,
          profile_picture_url,
          connections_count,
          is_expert,
          expert_verified_at,
          state_name,
          lga_name
        `)
        .eq('user_id', profileId)
        .single()

      if (profileError) throw profileError

      setProfile(profileData)

      // Check connection status if not own profile
      if (user?.id !== profileId) {
        const { data: connectionData } = await supabase
          .from('connections')
          .select('id')
          .or(`and(user1_id.eq.${user?.id},user2_id.eq.${profileId}),and(user1_id.eq.${profileId},user2_id.eq.${user?.id})`)
          .single()

        setIsConnected(!!connectionData)
      }

    } catch (error: any) {
      console.error('Error fetching profile:', error)
      toast({
        title: "Error loading profile",
        description: "Please try again later",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    if (!user || !profile || connecting) return

    setConnecting(true)
    try {
      const { error } = await supabase
        .from('connection_requests')
        .insert({
          requester_id: user.id,
          requested_id: profile.user_id
        })

      if (error) throw error

      toast({
        title: "Connection request sent!",
        description: `Your request has been sent to ${profile.full_name}`,
      })

      if (onConnect) {
        onConnect(profile.user_id)
      }

    } catch (error: any) {
      console.error('Connection error:', error)
      toast({
        title: "Connection failed",
        description: error.message || "Please try again later",
        variant: "destructive",
      })
    } finally {
      setConnecting(false)
    }
  }

  const handleMessage = () => {
    // Navigate to chat with this user
    window.location.href = `/chat?user=${profileId}`
  }

  const handleViewFullProfile = () => {
    window.location.href = `/profile/${profileId}`
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : profile ? (
          <>
            <DialogHeader className="pb-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={profile.profile_picture_url} />
                  <AvatarFallback className="bg-primary text-white text-lg font-bold">
                    {profile.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-lg font-bold text-text-primary truncate">
                      {profile.full_name}
                    </DialogTitle>
                    {profile.is_expert && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Expert
                      </Badge>
                    )}
                  </div>
                  
                  {profile.profession && (
                    <p className="text-sm text-text-secondary truncate">
                      {profile.profession}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 mt-2 text-xs text-text-secondary">
                    {profile.connections_count !== undefined && (
                      <span>{profile.connections_count} connections</span>
                    )}
                    
                    {(profile.state_name || profile.lga_name) && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{profile.lga_name || profile.state_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </DialogHeader>

            <CardContent className="px-0">
              {/* Bio */}
              {profile.bio && (
                <div className="mb-4">
                  <p className="text-sm text-text-primary leading-relaxed">
                    {profile.bio}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              {user?.id !== profile.user_id && (
                <div className="flex gap-2 mb-4">
                  {!isConnected ? (
                    <Button
                      onClick={handleConnect}
                      disabled={connecting}
                      className="flex-1 bg-brand-green hover:bg-brand-green-hover"
                      size="sm"
                    >
                      {connecting ? (
                        <>
                          <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full mr-2" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Connect
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      className="flex-1"
                      size="sm"
                      disabled
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Connected
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    onClick={handleMessage}
                    size="sm"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                </div>
              )}

              {/* View Full Profile Button */}
              <Button
                variant="outline"
                onClick={handleViewFullProfile}
                className="w-full"
                size="sm"
              >
                <User className="h-4 w-4 mr-2" />
                View Full Profile
              </Button>
            </CardContent>
          </>
        ) : (
          <div className="text-center p-8">
            <p className="text-text-secondary">Profile not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ProfilePreview