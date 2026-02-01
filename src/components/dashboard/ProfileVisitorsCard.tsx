import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Eye, Phone, Mail, MessageCircle, Video, Facebook, Users, TrendingUp } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { formatDistanceToNow } from 'date-fns'
import { Link } from 'react-router-dom'

interface ProfileView {
  id: string
  viewer_id: string | null
  viewed_at: string
  viewer_profile?: {
    full_name: string | null
    profession: string | null
    profile_picture_url: string | null
  }
}

interface ContactClick {
  id: string
  user_id: string
  button_type: string
  source_page: string | null
  created_at: string
  viewer_profile?: {
    full_name: string | null
    profession: string | null
    profile_picture_url: string | null
  }
}

const buttonTypeIcons: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  whatsapp: { icon: <MessageCircle className="h-3.5 w-3.5" />, label: 'WhatsApp', color: 'bg-green-500/10 text-green-600' },
  phone: { icon: <Phone className="h-3.5 w-3.5" />, label: 'Phone', color: 'bg-blue-500/10 text-blue-600' },
  email: { icon: <Mail className="h-3.5 w-3.5" />, label: 'Email', color: 'bg-purple-500/10 text-purple-600' },
  google_meet: { icon: <Video className="h-3.5 w-3.5" />, label: 'Meet', color: 'bg-orange-500/10 text-orange-600' },
  facebook: { icon: <Facebook className="h-3.5 w-3.5" />, label: 'Facebook', color: 'bg-indigo-500/10 text-indigo-600' },
}

export const ProfileVisitorsCard = () => {
  const { user } = useAuth()
  const [profileViews, setProfileViews] = useState<ProfileView[]>([])
  const [contactClicks, setContactClicks] = useState<ContactClick[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ views: 0, clicks: 0 })

  useEffect(() => {
    if (user?.id) {
      fetchVisitorData()
    }
  }, [user?.id])

  const fetchVisitorData = async () => {
    if (!user?.id) return
    setLoading(true)

    try {
      // Fetch profile views (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: views, error: viewsError } = await supabase
        .from('profile_views')
        .select('id, viewer_id, viewed_at')
        .eq('profile_user_id', user.id)
        .gte('viewed_at', thirtyDaysAgo.toISOString())
        .order('viewed_at', { ascending: false })
        .limit(50)

      if (viewsError) throw viewsError

      // Fetch contact clicks (communication_analytics where target_user_id = me)
      const { data: clicks, error: clicksError } = await supabase
        .from('communication_analytics')
        .select('id, user_id, button_type, source_page, created_at')
        .eq('target_user_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(50)

      if (clicksError) throw clicksError

      // Get unique viewer IDs to fetch their profiles
      const viewerIds = new Set([
        ...(views || []).map(v => v.viewer_id).filter(Boolean),
        ...(clicks || []).map(c => c.user_id).filter(Boolean)
      ])

      let profilesMap: Record<string, any> = {}
      if (viewerIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, profession, profile_picture_url')
          .in('user_id', Array.from(viewerIds))

        profilesMap = (profiles || []).reduce((acc, p) => {
          acc[p.user_id] = p
          return acc
        }, {} as Record<string, any>)
      }

      // Attach profiles to views
      const viewsWithProfiles = (views || []).map(v => ({
        ...v,
        viewer_profile: v.viewer_id ? profilesMap[v.viewer_id] : null
      }))

      // Attach profiles to clicks
      const clicksWithProfiles = (clicks || []).map(c => ({
        ...c,
        viewer_profile: c.user_id ? profilesMap[c.user_id] : null
      }))

      setProfileViews(viewsWithProfiles)
      setContactClicks(clicksWithProfiles)
      setStats({
        views: views?.length || 0,
        clicks: clicks?.length || 0
      })
    } catch (error) {
      console.error('Error fetching visitor data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name: string | null) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const VisitorItem = ({ 
    viewerId, 
    name, 
    profession, 
    avatarUrl, 
    timestamp, 
    actionBadge 
  }: { 
    viewerId: string | null
    name: string | null
    profession: string | null
    avatarUrl: string | null
    timestamp: string
    actionBadge?: React.ReactNode
  }) => (
    <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
      <Link to={viewerId ? `/profile/${viewerId}` : '#'} className="shrink-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="bg-muted text-xs">{getInitials(name)}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex-1 min-w-0">
        <Link 
          to={viewerId ? `/profile/${viewerId}` : '#'} 
          className="font-medium text-sm hover:text-primary truncate block"
        >
          {name || 'Anonymous User'}
        </Link>
        <p className="text-xs text-muted-foreground truncate">
          {profession || 'User'}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        {actionBadge}
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
        </span>
      </div>
    </div>
  )

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Profile Visitors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-3 w-16 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Eye className="h-5 w-5 text-primary" />
              Profile Insights
            </CardTitle>
            <CardDescription>See who's interested in your profile</CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {stats.views} views
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1 bg-primary/10 text-primary">
              <TrendingUp className="h-3 w-3" />
              {stats.clicks} clicks
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="views" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="views" className="text-sm">
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              Profile Views
            </TabsTrigger>
            <TabsTrigger value="clicks" className="text-sm">
              <Phone className="h-3.5 w-3.5 mr-1.5" />
              Contact Clicks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="views">
            <ScrollArea className="h-[300px] pr-2">
              {profileViews.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Eye className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No profile views yet</p>
                  <p className="text-xs">Complete your profile to attract more visitors</p>
                </div>
              ) : (
                profileViews.map(view => (
                  <VisitorItem
                    key={view.id}
                    viewerId={view.viewer_id}
                    name={view.viewer_profile?.full_name || null}
                    profession={view.viewer_profile?.profession || null}
                    avatarUrl={view.viewer_profile?.profile_picture_url || null}
                    timestamp={view.viewed_at}
                    actionBadge={
                      <Badge variant="outline" className="text-xs">
                        <Eye className="h-3 w-3 mr-1" />
                        Viewed
                      </Badge>
                    }
                  />
                ))
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="clicks">
            <ScrollArea className="h-[300px] pr-2">
              {contactClicks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Phone className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No contact clicks yet</p>
                  <p className="text-xs">Add your contact info to get inquiries</p>
                </div>
              ) : (
                contactClicks.map(click => {
                  const typeInfo = buttonTypeIcons[click.button_type] || { 
                    icon: <Phone className="h-3.5 w-3.5" />, 
                    label: click.button_type,
                    color: 'bg-muted'
                  }
                  return (
                    <VisitorItem
                      key={click.id}
                      viewerId={click.user_id}
                      name={click.viewer_profile?.full_name || null}
                      profession={click.viewer_profile?.profession || null}
                      avatarUrl={click.viewer_profile?.profile_picture_url || null}
                      timestamp={click.created_at}
                      actionBadge={
                        <Badge className={`text-xs ${typeInfo.color}`}>
                          {typeInfo.icon}
                          <span className="ml-1">{typeInfo.label}</span>
                        </Badge>
                      }
                    />
                  )
                })
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
