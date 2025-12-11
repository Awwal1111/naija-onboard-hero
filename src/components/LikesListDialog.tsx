import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Heart, UserPlus } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { UserBadges } from './UserBadges'
import ProfilePreview from './ProfilePreview'

interface LikeUser {
  user_id: string
  created_at: string
  profiles: {
    full_name: string
    profession?: string
    profile_picture_url?: string
    is_expert?: boolean
    email_verified?: boolean
    phone_verified?: boolean
    face_verified?: boolean
  } | null
}

interface LikesListDialogProps {
  isOpen: boolean
  onClose: () => void
  postId: string
  likesCount: number
}

const LikesListDialog: React.FC<LikesListDialogProps> = ({
  isOpen,
  onClose,
  postId,
  likesCount
}) => {
  const { user } = useAuth()
  const [likes, setLikes] = useState<LikeUser[]>([])
  const [loading, setLoading] = useState(false)
  const [profilePreview, setProfilePreview] = useState<{ isOpen: boolean; userId: string | null }>({
    isOpen: false,
    userId: null
  })

  useEffect(() => {
    if (isOpen && postId) {
      fetchLikes()
    }
  }, [isOpen, postId])

  const fetchLikes = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('post_likes')
        .select('user_id, created_at')
        .eq('post_id', postId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error

      if (data && data.length > 0) {
        // Fetch profiles for all users
        const userIds = data.map(like => like.user_id)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, profession, profile_picture_url, is_expert, email_verified, phone_verified, face_verified')
          .in('user_id', userIds)

        const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || [])

        const enrichedLikes: LikeUser[] = data.map(like => ({
          ...like,
          profiles: profilesMap.get(like.user_id) || null
        }))

        setLikes(enrichedLikes)
      } else {
        setLikes([])
      }
    } catch (error) {
      console.error('Error fetching likes:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-md max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500 fill-red-500" />
              {likesCount} {likesCount === 1 ? 'Like' : 'Likes'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : likes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Heart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No likes yet</p>
              </div>
            ) : (
              likes.map((like) => (
                <div
                  key={like.user_id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setProfilePreview({ isOpen: true, userId: like.user_id })}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={like.profiles?.profile_picture_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {like.profiles?.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-foreground">
                          {like.profiles?.full_name || 'User'}
                        </span>
                        <UserBadges
                          badges={{
                            isExpert: like.profiles?.is_expert,
                            emailVerified: like.profiles?.email_verified,
                            phoneVerified: like.profiles?.phone_verified,
                            faceVerified: like.profiles?.face_verified
                          }}
                          size="sm"
                        />
                      </div>
                      {like.profiles?.profession && (
                        <p className="text-sm text-muted-foreground">
                          {like.profiles.profession}
                        </p>
                      )}
                    </div>
                  </div>
                  {like.user_id !== user?.id && (
                    <Button variant="outline" size="sm" className="gap-1" onClick={(e) => e.stopPropagation()}>
                      <UserPlus className="h-4 w-4" />
                      Connect
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ProfilePreview
        isOpen={profilePreview.isOpen}
        onClose={() => setProfilePreview({ isOpen: false, userId: null })}
        profileId={profilePreview.userId || ''}
      />
    </>
  )
}

export default LikesListDialog
