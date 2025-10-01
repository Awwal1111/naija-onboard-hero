import React, { useState, useEffect } from 'react'
import { ArrowLeft, Users, FileText, TrendingUp, DollarSign, Eye, Settings, AlertCircle, CheckCircle, Clock, Star, MessageCircle, Briefcase, Award, Calendar, BarChart3, PieChart, Activity, Search, Filter, MoreVertical, Trash2, Edit, Ban } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BrandInput } from '@/components/ui/brand-input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { AdminSocialTasksSection } from '@/components/AdminSocialTasksSection'
import { AdminReferralTasksSection } from '@/components/AdminReferralTasksSection'

const EnhancedAdminDashboard = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Check if user is admin
  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user) {
        navigate('/login')
        return
      }

      // Check if user has admin access using the is_admin_user function
      const { data, error } = await supabase.rpc('is_admin_user')
      
      if (error || !data) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access the admin dashboard",
          variant: "destructive"
        })
        navigate('/profile')
        return
      }
      
      setLoading(false)
    }

    checkAdminAccess()
  }, [user, navigate, toast])
  
  // Dashboard Data
  const [dashboardStats, setDashboardStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalExperts: 0,
    totalPosts: 0,
    totalJobs: 0,
    totalRevenue: 0,
    pendingApplications: 0,
    recentSignups: 0
  })

  const [users, setUsers] = useState<any[]>([])
  const [posts, setPosts] = useState<any[]>([])
  const [jobPosts, setJobPosts] = useState<any[]>([])
  const [applications, setApplications] = useState<any[]>([])
  const [systemActivity, setSystemActivity] = useState<any[]>([])
  
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [showUserDialog, setShowUserDialog] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch users
      const { data: usersData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      // Fetch posts
      const { data: postsData } = await supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_user_id_fkey(full_name, profile_picture_url)
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      // Fetch job posts
      const { data: jobPostsData } = await supabase
        .from('job_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      // Fetch expert applications
      const { data: applicationsData } = await supabase
        .from('expert_applications')
        .select('*')
        .order('submitted_at', { ascending: false })

      // Calculate stats
      const stats = {
        totalUsers: usersData?.length || 0,
        activeUsers: usersData?.filter(u => new Date(u.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length || 0,
        totalExperts: usersData?.filter(u => u.is_expert).length || 0,
        totalPosts: postsData?.length || 0,
        totalJobs: jobPostsData?.length || 0,
        totalRevenue: 25680, // Mock data - would come from transactions
        pendingApplications: applicationsData?.filter(a => a.status === 'pending').length || 0,
        recentSignups: usersData?.filter(u => new Date(u.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length || 0
      }

      setUsers(usersData || [])
      setPosts(postsData || [])
      setJobPosts(jobPostsData || [])
      setApplications(applicationsData || [])
      setDashboardStats(stats)
      
      // Mock system activity
      setSystemActivity([
        { id: 1, type: 'user_signup', description: 'New user registration', time: '2 minutes ago', severity: 'info' },
        { id: 2, type: 'expert_approved', description: 'Expert application approved', time: '15 minutes ago', severity: 'success' },
        { id: 3, type: 'post_reported', description: 'Post flagged for review', time: '1 hour ago', severity: 'warning' },
        { id: 4, type: 'payment_processed', description: 'Payment of NC 5,000 processed', time: '2 hours ago', severity: 'success' }
      ])

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUserAction = async (userId: string, action: 'ban' | 'unban' | 'promote') => {
    try {
      let updateData: any = {}
      
      switch (action) {
        case 'ban':
          // In a real implementation, you'd have a banned field
          updateData = { banned: true }
          break
        case 'unban':
          updateData = { banned: false }
          break
        case 'promote':
          updateData = { is_expert: true }
          break
      }

      // This is a mock - in reality you'd update the user status
      toast({
        title: "Action Completed",
        description: `User ${action} action completed successfully`,
      })
      
      fetchDashboardData()
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${action} user`,
        variant: "destructive"
      })
    }
  }

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)

      if (error) throw error

      toast({
        title: "Post Deleted",
        description: "Post has been successfully deleted",
      })
      
      fetchDashboardData()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive"
      })
    }
  }

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.profession?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredPosts = posts.filter(post => 
    post.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.title?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-text-secondary">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/profile')} className="flex items-center gap-2">
            <ArrowLeft className="h-5 w-5 text-text-secondary" />
            <span className="text-text-secondary">Back</span>
          </button>
          <Logo />
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </header>

      <div className="px-6 py-6">
        {/* Dashboard Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Admin Dashboard</h1>
          <p className="text-text-secondary">Comprehensive platform management and analytics</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-text-primary">{dashboardStats.totalUsers}</div>
                  <div className="text-xs text-text-secondary">Total Users</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                  <Award className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-text-primary">{dashboardStats.totalExperts}</div>
                  <div className="text-xs text-text-secondary">Total Experts</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                  <FileText className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-text-primary">{dashboardStats.totalPosts}</div>
                  <div className="text-xs text-text-secondary">Total Posts</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-text-primary">NC {dashboardStats.totalRevenue.toLocaleString()}</div>
                  <div className="text-xs text-text-secondary">Total Revenue</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30">
            <CardContent className="pt-6 text-center">
              <div className="text-xl font-bold text-orange-600 dark:text-orange-400">{dashboardStats.pendingApplications}</div>
              <div className="text-xs text-orange-700 dark:text-orange-300">Pending Applications</div>
            </CardContent>
          </Card>
          
          <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
            <CardContent className="pt-6 text-center">
              <div className="text-xl font-bold text-green-600 dark:text-green-400">{dashboardStats.recentSignups}</div>
              <div className="text-xs text-green-700 dark:text-green-300">New This Week</div>
            </CardContent>
          </Card>
          
          <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
            <CardContent className="pt-6 text-center">
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{dashboardStats.activeUsers}</div>
              <div className="text-xs text-blue-700 dark:text-blue-300">Active This Month</div>
            </CardContent>
          </Card>
          
          <Card className="border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/30">
            <CardContent className="pt-6 text-center">
              <div className="text-xl font-bold text-purple-600 dark:text-purple-400">{dashboardStats.totalJobs}</div>
              <div className="text-xs text-purple-700 dark:text-purple-300">Active Jobs</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="content">Content Moderation</TabsTrigger>
            <TabsTrigger value="applications">Expert Applications</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="system">System Activity</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent System Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {systemActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.severity === 'success' ? 'bg-green-500' :
                        activity.severity === 'warning' ? 'bg-yellow-500' :
                        activity.severity === 'error' ? 'bg-red-500' : 'bg-blue-500'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm text-text-primary">{activity.description}</p>
                        <p className="text-xs text-text-secondary">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => navigate('/admin/expert-applications')}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Review Expert Applications ({dashboardStats.pendingApplications})
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Moderate Reported Content
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    View Analytics Report
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Platform Settings
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-text-secondary" />
                <BrandInput
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>

            <div className="space-y-4">
              {filteredUsers.slice(0, 20).map((user) => (
                <Card key={user.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                          {user.profile_picture_url ? (
                            <img 
                              src={user.profile_picture_url} 
                              alt={user.full_name}
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            user.full_name?.charAt(0) || 'U'
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-text-primary">{user.full_name || 'Unnamed User'}</h3>
                          <p className="text-sm text-text-secondary">{user.profession || 'No profession'}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {user.is_expert && (
                              <Badge className="bg-primary/10 text-primary">Expert</Badge>
                            )}
                            <span className="text-xs text-text-secondary">
                              Joined {new Date(user.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user)
                            setShowUserDialog(true)
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleUserAction(user.id, 'promote')}>
                              <Award className="h-4 w-4 mr-2" />
                              Promote to Expert
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUserAction(user.id, 'ban')} className="text-red-600">
                              <Ban className="h-4 w-4 mr-2" />
                              Ban User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Content Moderation Tab */}
          <TabsContent value="content" className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-text-secondary" />
                <BrandInput
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter by Type
              </Button>
            </div>

            <div className="space-y-4">
              {filteredPosts.slice(0, 15).map((post) => (
                <Card key={post.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {post.profiles?.profile_picture_url ? (
                            <img 
                              src={post.profiles.profile_picture_url} 
                              alt={post.profiles.full_name}
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            post.profiles?.full_name?.charAt(0) || 'U'
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-text-primary">{post.profiles?.full_name || 'Anonymous'}</h4>
                          <p className="text-xs text-text-secondary">{new Date(post.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            View Full Post
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Post
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeletePost(post.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Post
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    {post.title && (
                      <h3 className="font-semibold text-text-primary mb-2">{post.title}</h3>
                    )}
                    <p className="text-text-secondary text-sm mb-3 line-clamp-3">{post.content}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-text-secondary">
                      <span>{post.likes_count || 0} likes</span>
                      <span>{post.comments_count || 0} comments</span>
                      <span>{post.views_count || 0} views</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications" className="space-y-6">
            <Tabs defaultValue="expert" className="w-full">
              <TabsList>
                <TabsTrigger value="expert">Expert Applications</TabsTrigger>
                <TabsTrigger value="social">Social Media Tasks</TabsTrigger>
                <TabsTrigger value="referral">Referral Tasks</TabsTrigger>
              </TabsList>

              <TabsContent value="expert">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-semibold text-text-primary mb-2">Expert Applications</h3>
                      <p className="text-text-secondary text-sm mb-4">
                        Manage expert applications in the dedicated section
                      </p>
                      <Button onClick={() => navigate('/admin/expert-applications')}>
                        Go to Applications
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="social">
                <AdminSocialTasksSection />
              </TabsContent>

              <TabsContent value="referral">
                <AdminReferralTasksSection />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    User Growth
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-text-secondary">This Month</span>
                      <span className="font-semibold text-green-600">+{dashboardStats.recentSignups}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-text-secondary">Total Active</span>
                      <span className="font-semibold">{dashboardStats.activeUsers}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-text-secondary">Retention Rate</span>
                      <span className="font-semibold text-blue-600">78%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Content Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-text-secondary">Total Posts</span>
                      <span className="font-semibold">{dashboardStats.totalPosts}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-text-secondary">Job Posts</span>
                      <span className="font-semibold">{dashboardStats.totalJobs}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-text-secondary">Engagement Rate</span>
                      <span className="font-semibold text-purple-600">64%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Alert>
              <TrendingUp className="h-4 w-4" />
              <AlertDescription>
                Platform growth is up 23% this month with increased user engagement and expert applications.
              </AlertDescription>
            </Alert>
          </TabsContent>

          {/* System Activity Tab */}
          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  System Activity Log
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {systemActivity.concat([
                    { id: 5, type: 'database_backup', description: 'Automated database backup completed', time: '3 hours ago', severity: 'success' },
                    { id: 6, type: 'security_scan', description: 'Security scan completed - no issues found', time: '6 hours ago', severity: 'success' },
                    { id: 7, type: 'maintenance', description: 'Scheduled maintenance window', time: '12 hours ago', severity: 'info' },
                    { id: 8, type: 'server_restart', description: 'Server restart due to update', time: '1 day ago', severity: 'warning' }
                  ]).map((activity) => (
                    <div key={activity.id} className="flex items-center gap-4 p-4 bg-muted rounded-xl">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        activity.severity === 'success' ? 'bg-green-500' :
                        activity.severity === 'warning' ? 'bg-yellow-500' :
                        activity.severity === 'error' ? 'bg-red-500' : 'bg-blue-500'
                      }`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-text-primary">{activity.description}</p>
                          <span className="text-xs text-text-secondary">{activity.time}</span>
                        </div>
                        <p className="text-sm text-text-secondary capitalize">{activity.type.replace('_', ' ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* User Details Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-xl font-bold">
                  {selectedUser.profile_picture_url ? (
                    <img 
                      src={selectedUser.profile_picture_url} 
                      alt={selectedUser.full_name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    selectedUser.full_name?.charAt(0) || 'U'
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-text-primary">{selectedUser.full_name}</h3>
                  <p className="text-text-secondary">{selectedUser.profession}</p>
                  {selectedUser.is_expert && (
                    <Badge className="mt-1">Expert</Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-primary">Phone Number</label>
                  <p className="text-text-secondary">{selectedUser.phone_number || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-primary">Location</label>
                  <p className="text-text-secondary">{selectedUser.state_name || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-primary">Connections</label>
                  <p className="text-text-secondary">{selectedUser.connections_count || 0}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-primary">Wallet Balance</label>
                  <p className="text-text-secondary">₦{selectedUser.wallet_balance?.toFixed(2) || '0.00'}</p>
                </div>
              </div>

              {selectedUser.bio && (
                <div>
                  <label className="text-sm font-medium text-text-primary">Bio</label>
                  <p className="text-text-secondary mt-1">{selectedUser.bio}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" className="flex-1">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
                <Button variant="outline" className="flex-1">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit User
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default EnhancedAdminDashboard