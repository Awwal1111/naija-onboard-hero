import React, { useState, useEffect } from 'react'
import { ArrowLeft, TrendingUp, Eye, DollarSign, Users, Briefcase, Award, Heart, MessageCircle, Calendar, BarChart3 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts'

const COLORS = ['#00C49F', '#0088FE', '#FFBB28', '#FF8042', '#8884d8']

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
    storyViews: 0,
    jobs: 0,
    jobApplications: 0,
    earned: 0,
    spent: 0,
    rating: 0
  })
  
  const [charts, setCharts] = useState<any>({
    engagementTrend: [],
    walletTrend: [],
    postPerformance: [],
    storyViews: [],
    transactionBreakdown: []
  })
  
  useEffect(() => {
    if (user) fetchAnalytics()
  }, [user])
  
  const fetchAnalytics = async () => {
    try {
      const [profile, posts, transactions, stories, storyViews, jobs, jobApplications] = await Promise.all([
        supabase.from('profiles').select('full_name, profile_picture_url, wallet_balance, created_at').eq('user_id', user?.id).single(),
        supabase.from('posts').select('id, views_count, likes_count, comments_count, created_at').eq('user_id', user?.id),
        supabase.from('wallet_transactions').select('amount, kind, created_at').eq('user_id', user?.id).order('created_at', { ascending: false }).limit(200),
        supabase.from('stories').select('id', { count: 'exact', head: true }).eq('user_id', user?.id),
        supabase.from('story_views').select('id', { count: 'exact', head: true }),
        supabase.from('job_posts').select('id', { count: 'exact', head: true }).eq('user_id', user?.id),
        supabase.from('job_applications').select('id', { count: 'exact', head: true }).eq('applicant_id', user?.id)
      ])
      
      const postStats = posts.data?.reduce((acc, p) => ({
        views: acc.views + (p.views_count || 0),
        likes: acc.likes + (p.likes_count || 0),
        comments: acc.comments + (p.comments_count || 0)
      }), { views: 0, likes: 0, comments: 0 }) || { views: 0, likes: 0, comments: 0 }
      
      const earnings = transactions.data?.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0) || 0
      const spent = Math.abs(transactions.data?.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0) || 0)
      
      // Engagement trend (last 7 days)
      const engagementTrend = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        
        const dayPosts = posts.data?.filter(p => p.created_at.startsWith(dateStr)) || []
        const dayLikes = dayPosts.reduce((sum, p) => sum + (p.likes_count || 0), 0)
        const dayComments = dayPosts.reduce((sum, p) => sum + (p.comments_count || 0), 0)
        
        engagementTrend.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          likes: dayLikes,
          comments: dayComments,
          posts: dayPosts.length
        })
      }
      
      // Wallet trend (last 30 days)
      const walletTrend = []
      let runningBalance = 0
      for (let i = 29; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        
        const dayTransactions = transactions.data?.filter(t => t.created_at.startsWith(dateStr)) || []
        const dayTotal = dayTransactions.reduce((sum, t) => sum + t.amount, 0)
        runningBalance += dayTotal
        
        if (i % 3 === 0) { // Show every 3rd day to avoid clutter
          walletTrend.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            balance: runningBalance,
            earned: dayTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
            spent: Math.abs(dayTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0))
          })
        }
      }
      
      // Top performing posts
      const topPosts = posts.data
        ?.sort((a, b) => ((b.likes_count || 0) + (b.comments_count || 0)) - ((a.likes_count || 0) + (a.comments_count || 0)))
        .slice(0, 5)
        .map(p => ({
          title: p.title || p.content?.substring(0, 30) + '...' || 'Post',
          engagement: (p.likes_count || 0) + (p.comments_count || 0),
          likes: p.likes_count || 0,
          comments: p.comments_count || 0
        })) || []
      
      // Story views breakdown
      const storyViewsData = stories.data?.map(s => {
        const views = storyViews.data?.filter(v => v.story_id === s.id).length || 0
        return {
          name: new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          views
        }
      }) || []
      
      // Transaction breakdown
      const transactionTypes = [
        { name: 'Earned', value: earnings },
        { name: 'Spent', value: spent }
      ]
      
      setStats({
        connections: profile.data?.connections_count || 0,
        totalViews: postStats.views,
        balance: profile.data?.wallet_balance || 0,
        engagement: posts.data?.length ? ((postStats.likes + postStats.comments) / posts.data.length).toFixed(1) : 0,
        posts: posts.data?.length || 0,
        likes: postStats.likes,
        comments: postStats.comments,
        stories: stories.data?.length || 0,
        storyViews: storyViews.data?.length || 0,
        jobs: jobs.data?.length || 0,
        jobApplications: jobApplications.data?.length || 0,
        earned: earnings,
        spent,
        rating: profile.data?.average_rating || 0
      })
      
      setCharts({
        engagementTrend,
        walletTrend,
        postPerformance: topPosts,
        storyViews: storyViewsData.slice(0, 10),
        transactionBreakdown: transactionTypes
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
        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-primary/10 rounded-lg"><Users className="h-5 w-5 text-primary" /></div><div><div className="text-2xl font-bold">{stats.connections}</div><div className="text-xs text-text-secondary">Connections</div></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-blue-500/10 rounded-lg"><Eye className="h-5 w-5 text-blue-500" /></div><div><div className="text-2xl font-bold">{stats.totalViews}</div><div className="text-xs text-text-secondary">Total Views</div></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-green-500/10 rounded-lg"><DollarSign className="h-5 w-5 text-green-500" /></div><div><div className="text-2xl font-bold">NC {stats.balance.toLocaleString()}</div><div className="text-xs text-text-secondary">Balance</div></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-purple-500/10 rounded-lg"><TrendingUp className="h-5 w-5 text-purple-500" /></div><div><div className="text-2xl font-bold">{stats.engagement}</div><div className="text-xs text-text-secondary">Avg Engagement</div></div></div></CardContent></Card>
        </div>
        
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="stories">Stories</TabsTrigger>
            <TabsTrigger value="wallet">Wallet</TabsTrigger>
            <TabsTrigger value="jobs">Jobs</TabsTrigger>
          </TabsList>
          
          {/* Posts Tab */}
          <TabsContent value="posts" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Post Performance</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center mb-6">
                  <div><div className="text-3xl font-bold text-primary">{stats.posts}</div><div className="text-xs text-text-secondary">Posts</div></div>
                  <div><div className="text-3xl font-bold text-red-500">{stats.likes}</div><div className="text-xs text-text-secondary">Likes</div></div>
                  <div><div className="text-3xl font-bold text-blue-500">{stats.comments}</div><div className="text-xs text-text-secondary">Comments</div></div>
                </div>
              </CardContent>
            </Card>
            
            {/* Engagement Trend */}
            {charts.engagementTrend.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Engagement Trend (7 Days)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={charts.engagementTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="likes" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Likes" />
                      <Area type="monotone" dataKey="comments" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Comments" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
            
            {/* Top Posts */}
            {charts.postPerformance.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Top Performing Posts</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={charts.postPerformance} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="title" type="category" width={100} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="likes" fill="#ef4444" name="Likes" />
                      <Bar dataKey="comments" fill="#3b82f6" name="Comments" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* Stories Tab */}
          <TabsContent value="stories" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Story Performance</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-center mb-6">
                  <div><div className="text-4xl font-bold text-primary">{stats.stories}</div><div className="text-xs text-text-secondary">Stories Posted</div></div>
                  <div><div className="text-4xl font-bold text-purple-500">{stats.storyViews}</div><div className="text-xs text-text-secondary">Total Views</div></div>
                </div>
              </CardContent>
            </Card>
            
            {/* Story Views Chart */}
            {charts.storyViews.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Story Views Over Time</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={charts.storyViews}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="views" stroke="#a855f7" strokeWidth={2} name="Views" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* Wallet Tab */}
          <TabsContent value="wallet" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Wallet Overview</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-green-500/10 rounded-lg"><div className="text-2xl font-bold text-green-600">NC {stats.earned.toLocaleString()}</div><div className="text-xs text-text-secondary">Total Earned</div></div>
                  <div className="p-4 bg-red-500/10 rounded-lg"><div className="text-2xl font-bold text-red-600">NC {stats.spent.toLocaleString()}</div><div className="text-xs text-text-secondary">Total Spent</div></div>
                </div>
              </CardContent>
            </Card>
            
            {/* Wallet Trend */}
            {charts.walletTrend.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Balance Trend (30 Days)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={charts.walletTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={2} name="Balance (NC)" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
            
            {/* Transaction Breakdown */}
            {charts.transactionBreakdown.filter(t => t.value > 0).length > 0 && (
              <Card>
                <CardHeader><CardTitle>Transaction Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={charts.transactionBreakdown.filter(t => t.value > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: NC ${entry.value.toLocaleString()}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {charts.transactionBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* Jobs Tab */}
          <TabsContent value="jobs" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Job Activity</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div><div className="text-4xl font-bold text-primary">{stats.jobs}</div><div className="text-xs text-text-secondary">Jobs Posted</div></div>
                  <div><div className="text-4xl font-bold text-blue-500">{stats.jobApplications}</div><div className="text-xs text-text-secondary">Applications Sent</div></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Expert Rating */}
        {stats.rating > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-primary" />Expert Rating</CardTitle></CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-5xl font-bold text-primary">{stats.rating.toFixed(1)}</div>
                <div className="text-sm text-text-secondary mt-2">Average Rating</div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default Analytics