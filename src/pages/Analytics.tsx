import React, { useState, useEffect } from 'react'
import { ArrowLeft, TrendingUp, Eye, DollarSign, Users, Briefcase, Award, Heart, MessageCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts'

const Analytics = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>({
    connections: 0,
    totalViews: 0,
    balance: 0,
    engagement: 0,
    posts: 0,
    likes: 0,
    comments: 0,
    stories: 0,
    jobs: 0,
    earned: 0,
    spent: 0,
    rating: 0
  })
  
  const [charts, setCharts] = useState<any>({
    earnings: [],
    engagement: [],
    wallet: []
  })
  
  useEffect(() => {
    if (user) fetchAnalytics()
  }, [user])
  
  const fetchAnalytics = async () => {
    try {
      const [profile, posts, transactions, stories] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user?.id).single(),
        supabase.from('posts').select('*').eq('user_id', user?.id),
        supabase.from('wallet_transactions').select('*').eq('user_id', user?.id),
        supabase.from('stories').select('*').eq('user_id', user?.id)
      ])
      
      const postStats = posts.data?.reduce((acc, p) => ({
        views: acc.views + (p.views_count || 0),
        likes: acc.likes + (p.likes_count || 0),
        comments: acc.comments + (p.comments_count || 0)
      }), { views: 0, likes: 0, comments: 0 }) || { views: 0, likes: 0, comments: 0 }
      
      const earnings = transactions.data?.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0) || 0
      const spent = Math.abs(transactions.data?.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0) || 0)
      
      setStats({
        connections: profile.data?.connections_count || 0,
        totalViews: postStats.views,
        balance: profile.data?.wallet_balance || 0,
        engagement: posts.data?.length ? ((postStats.likes + postStats.comments) / posts.data.length).toFixed(1) : 0,
        posts: posts.data?.length || 0,
        likes: postStats.likes,
        comments: postStats.comments,
        stories: stories.data?.length || 0,
        jobs: 0,
        earned: earnings,
        spent,
        rating: profile.data?.average_rating || 0
      })
      
      setLoading(false)
    } catch (error) {
      console.error(error)
      toast({ title: "Error loading analytics", variant: "destructive" })
      setLoading(false)
    }
  }
  
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
  
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-lg font-semibold">My Analytics</h1>
          <div className="w-16" />
        </div>
      </header>
      
      <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-primary/10 rounded-lg"><Users className="h-5 w-5 text-primary" /></div><div><div className="text-2xl font-bold">{stats.connections}</div><div className="text-xs text-text-secondary">Connections</div></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-blue-500/10 rounded-lg"><Eye className="h-5 w-5 text-blue-500" /></div><div><div className="text-2xl font-bold">{stats.totalViews}</div><div className="text-xs text-text-secondary">Total Views</div></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-green-500/10 rounded-lg"><DollarSign className="h-5 w-5 text-green-500" /></div><div><div className="text-2xl font-bold">₦{stats.balance.toLocaleString()}</div><div className="text-xs text-text-secondary">Balance</div></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-purple-500/10 rounded-lg"><TrendingUp className="h-5 w-5 text-purple-500" /></div><div><div className="text-2xl font-bold">{stats.engagement}</div><div className="text-xs text-text-secondary">Avg Engagement</div></div></div></CardContent></Card>
        </div>
        
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-3"><TabsTrigger value="posts">Posts</TabsTrigger><TabsTrigger value="wallet">Wallet</TabsTrigger><TabsTrigger value="stories">Stories</TabsTrigger></TabsList>
          
          <TabsContent value="posts" className="space-y-4">
            <Card><CardHeader><CardTitle>Post Performance</CardTitle></CardHeader><CardContent><div className="grid grid-cols-3 gap-4 text-center"><div><div className="text-3xl font-bold text-primary">{stats.posts}</div><div className="text-xs text-text-secondary">Posts</div></div><div><div className="text-3xl font-bold text-red-500">{stats.likes}</div><div className="text-xs text-text-secondary">Likes</div></div><div><div className="text-3xl font-bold text-blue-500">{stats.comments}</div><div className="text-xs text-text-secondary">Comments</div></div></div></CardContent></Card>
          </TabsContent>
          
          <TabsContent value="wallet" className="space-y-4">
            <Card><CardHeader><CardTitle>Wallet Overview</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 gap-4"><div className="p-4 bg-green-500/10 rounded-lg"><div className="text-2xl font-bold text-green-600">₦{stats.earned.toLocaleString()}</div><div className="text-xs text-text-secondary">Total Earned</div></div><div className="p-4 bg-red-500/10 rounded-lg"><div className="text-2xl font-bold text-red-600">₦{stats.spent.toLocaleString()}</div><div className="text-xs text-text-secondary">Total Spent</div></div></div></CardContent></Card>
          </TabsContent>
          
          <TabsContent value="stories" className="space-y-4">
            <Card><CardHeader><CardTitle>Story Performance</CardTitle></CardHeader><CardContent><div className="text-center"><div className="text-4xl font-bold text-primary">{stats.stories}</div><div className="text-xs text-text-secondary">Stories Posted</div></div></CardContent></Card>
          </TabsContent>
        </Tabs>
        
        {stats.rating > 0 && (
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-primary" />Expert Rating</CardTitle></CardHeader><CardContent><div className="text-center"><div className="text-5xl font-bold text-primary">{stats.rating.toFixed(1)}</div><div className="text-sm text-text-secondary mt-2">Average Rating</div></div></CardContent></Card>
        )}
      </div>
    </div>
  )
}

export default Analytics
