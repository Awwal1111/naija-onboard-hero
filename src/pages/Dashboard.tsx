import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, TrendingUp, Eye, DollarSign, Users, Briefcase, Award, 
  Heart, MessageCircle, ShoppingBag, GraduationCap, Video, Star,
  ArrowUpRight, ArrowDownRight, Wallet, Target, Zap, Shield,
  ChevronRight, Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTrustScore } from '@/hooks/useTrustScore';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    // Overview
    totalEarnings: 0,
    totalSpent: 0,
    walletBalance: 0,
    trustScore: 0,
    // Content
    postsCount: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    storiesCount: 0,
    storyViews: 0,
    // Business
    jobsPosted: 0,
    jobApplications: 0,
    coursesCreated: 0,
    courseEnrollments: 0,
    productsCreated: 0,
    productSales: 0,
    fundraisingsCreated: 0,
    fundraisingRaised: 0,
    classesCreated: 0,
    classParticipants: 0,
    // Engagement
    connectionsCount: 0,
    avgRating: 0,
    ratingCount: 0
  });
  
  const [charts, setCharts] = useState({
    earningsTrend: [] as any[],
    engagementTrend: [] as any[],
    contentBreakdown: [] as any[],
    revenueBreakdown: [] as any[]
  });

  const trustScore = useTrustScore({
    emailVerified: profile?.email_verified,
    phoneVerified: profile?.phone_verified,
    faceVerified: profile?.face_verified,
    averageRating: profile?.average_rating,
    ratingCount: profile?.rating_count,
    createdAt: profile?.created_at,
    avgResponseTimeSeconds: profile?.avg_response_time_seconds,
    connectionsCount: profile?.connections_count,
    isExpert: profile?.is_expert
  });

  useEffect(() => {
    if (user) fetchAllStats();
  }, [user]);

  const fetchAllStats = async () => {
    try {
      const profileRes = await supabase.from('profiles').select('*').eq('user_id', user?.id).single();
      setProfile(profileRes.data);
      
      const [
        posts,
        stories,
        storyViews,
        transactions,
        jobs,
        jobApps,
        courses,
        enrollments,
        products,
        productPurchases,
        fundraisings,
        contributions,
        classes,
        classParticipants,
        ratings
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user?.id).single(),
        supabase.from('posts').select('*').eq('user_id', user?.id),
        supabase.from('stories').select('*').eq('user_id', user?.id),
        supabase.from('story_views').select('*, stories!inner(user_id)').eq('stories.user_id', user?.id),
        supabase.from('wallet_transactions').select('*').eq('user_id', user?.id).order('created_at', { ascending: false }),
        supabase.from('job_posts').select('*').eq('user_id', user?.id),
        supabase.from('job_post_applications').select('*').eq('applicant_id', user?.id),
        supabase.from('courses').select('*').eq('user_id', user?.id),
        supabase.from('course_enrollments').select('*, courses!inner(user_id)').eq('courses.user_id', user?.id),
        supabase.from('digital_products').select('*').eq('user_id', user?.id),
        supabase.from('digital_product_purchases').select('*, digital_products!inner(user_id)').eq('digital_products.user_id', user?.id),
        supabase.from('fundraisings').select('*').eq('user_id', user?.id),
        supabase.from('fundraising_contributions').select('*, fundraisings!inner(user_id)').eq('fundraisings.user_id', user?.id),
        supabase.from('expert_classes').select('*').eq('expert_id', user?.id),
        supabase.from('class_participants').select('*, expert_classes!inner(expert_id)').eq('expert_classes.expert_id', user?.id),
        supabase.from('expert_ratings').select('*').eq('expert_id', user?.id)
      ]);

      // Calculate stats
      const totalEarnings = transactions.data?.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0) || 0;
      const totalSpent = Math.abs(transactions.data?.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0) || 0);
      const postStats = posts.data?.reduce((acc, p) => ({
        views: acc.views + (p.views_count || 0),
        likes: acc.likes + (p.likes_count || 0),
        comments: acc.comments + (p.comments_count || 0)
      }), { views: 0, likes: 0, comments: 0 }) || { views: 0, likes: 0, comments: 0 };
      
      const courseRevenue = enrollments.data?.reduce((sum, e) => sum + e.amount, 0) || 0;
      const productRevenue = productPurchases.data?.reduce((sum, p) => sum + p.amount, 0) || 0;
      const fundraisingRaised = contributions.data?.reduce((sum, c) => sum + c.amount, 0) || 0;
      const avgRating = ratings.data?.length ? ratings.data.reduce((sum, r) => sum + r.rating, 0) / ratings.data.length : 0;

      setStats({
        totalEarnings,
        totalSpent,
        walletBalance: profileData.data?.wallet_balance || 0,
        trustScore: trustScore.score,
        postsCount: posts.data?.length || 0,
        totalViews: postStats.views,
        totalLikes: postStats.likes,
        totalComments: postStats.comments,
        storiesCount: stories.data?.length || 0,
        storyViews: storyViews.data?.length || 0,
        jobsPosted: jobs.data?.length || 0,
        jobApplications: jobApps.data?.length || 0,
        coursesCreated: courses.data?.length || 0,
        courseEnrollments: enrollments.data?.length || 0,
        productsCreated: products.data?.length || 0,
        productSales: productPurchases.data?.length || 0,
        fundraisingsCreated: fundraisings.data?.length || 0,
        fundraisingRaised,
        classesCreated: classes.data?.length || 0,
        classParticipants: classParticipants.data?.length || 0,
        connectionsCount: profileData.data?.connections_count || 0,
        avgRating,
        ratingCount: ratings.data?.length || 0
      });

      // Build charts
      const earningsTrend = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayTransactions = transactions.data?.filter(t => t.created_at.startsWith(dateStr)) || [];
        const earned = dayTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
        const spent = Math.abs(dayTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));
        earningsTrend.push({
          date: date.toLocaleDateString('en-US', { weekday: 'short' }),
          earned,
          spent
        });
      }

      const engagementTrend = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayPosts = posts.data?.filter(p => p.created_at.startsWith(dateStr)) || [];
        engagementTrend.push({
          date: date.toLocaleDateString('en-US', { weekday: 'short' }),
          likes: dayPosts.reduce((sum, p) => sum + (p.likes_count || 0), 0),
          comments: dayPosts.reduce((sum, p) => sum + (p.comments_count || 0), 0),
          views: dayPosts.reduce((sum, p) => sum + (p.views_count || 0), 0)
        });
      }

      const contentBreakdown = [
        { name: 'Posts', value: posts.data?.length || 0 },
        { name: 'Stories', value: stories.data?.length || 0 },
        { name: 'Jobs', value: jobs.data?.length || 0 },
        { name: 'Courses', value: courses.data?.length || 0 },
        { name: 'Products', value: products.data?.length || 0 }
      ].filter(item => item.value > 0);

      const revenueBreakdown = [
        { name: 'Courses', value: courseRevenue },
        { name: 'Products', value: productRevenue },
        { name: 'Fundraising', value: fundraisingRaised },
        { name: 'Other', value: totalEarnings - courseRevenue - productRevenue - fundraisingRaised }
      ].filter(item => item.value > 0);

      setCharts({ earningsTrend, engagementTrend, contentBreakdown, revenueBreakdown });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const quickActions = [
    { label: 'My Jobs', path: '/jobs', icon: Briefcase, count: stats.jobsPosted, color: 'bg-blue-500/10 text-blue-500' },
    { label: 'My Courses', path: '/courses', icon: GraduationCap, count: stats.coursesCreated, color: 'bg-orange-500/10 text-orange-500' },
    { label: 'My Products', path: '/digital-products', icon: ShoppingBag, count: stats.productsCreated, color: 'bg-green-500/10 text-green-500' },
    { label: 'My Classes', path: '/expert-class', icon: Video, count: stats.classesCreated, color: 'bg-purple-500/10 text-purple-500' },
    { label: 'Fundraising', path: '/fundraising', icon: Heart, count: stats.fundraisingsCreated, color: 'bg-red-500/10 text-red-500' },
    { label: 'Wallet', path: '/profile', icon: Wallet, count: stats.walletBalance, color: 'bg-emerald-500/10 text-emerald-500' }
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-xl font-bold">Dashboard</h1>
            <p className="text-xs text-muted-foreground">Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
            Settings
          </Button>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6 max-w-6xl mx-auto">
        {/* Trust Score Card */}
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/20 rounded-xl">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Trust Score</h3>
                  <p className="text-xs text-muted-foreground">{trustScore.levelLabel}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-primary">{trustScore.score}</div>
                <div className="text-xs text-muted-foreground">out of 100</div>
              </div>
            </div>
            <Progress value={trustScore.score} className="h-2" />
            <div className="grid grid-cols-4 gap-2 mt-4 text-center text-xs">
              <div>
                <div className="font-semibold">{trustScore.breakdown.verification}</div>
                <div className="text-muted-foreground">Verification</div>
              </div>
              <div>
                <div className="font-semibold">{trustScore.breakdown.reputation}</div>
                <div className="text-muted-foreground">Reputation</div>
              </div>
              <div>
                <div className="font-semibold">{trustScore.breakdown.activity}</div>
                <div className="text-muted-foreground">Activity</div>
              </div>
              <div>
                <div className="font-semibold">{trustScore.breakdown.community}</div>
                <div className="text-muted-foreground">Community</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <Wallet className="h-4 w-4 text-emerald-500" />
                </div>
                <span className="text-xs text-muted-foreground">Balance</span>
              </div>
              <div className="text-xl font-bold">₦{stats.walletBalance.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                </div>
                <span className="text-xs text-muted-foreground">Earned</span>
              </div>
              <div className="text-xl font-bold text-green-600">+₦{stats.totalEarnings.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                </div>
                <span className="text-xs text-muted-foreground">Spent</span>
              </div>
              <div className="text-xl font-bold text-red-600">-₦{stats.totalSpent.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Star className="h-4 w-4 text-yellow-500" />
                </div>
                <span className="text-xs text-muted-foreground">Rating</span>
              </div>
              <div className="text-xl font-bold">{stats.avgRating.toFixed(1)} <span className="text-xs text-muted-foreground">({stats.ratingCount})</span></div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Access</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {quickActions.map((action) => (
                <button
                  key={action.path}
                  onClick={() => navigate(action.path)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-accent transition-colors"
                >
                  <div className={`p-3 rounded-xl ${action.color}`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium text-center">{action.label}</span>
                  {action.count > 0 && (
                    <Badge variant="secondary" className="text-xs">{action.count}</Badge>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tabs for detailed analytics */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="business">Business</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Engagement Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Engagement Trend (7 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={charts.engagementTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Area type="monotone" dataKey="views" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} name="Views" />
                    <Area type="monotone" dataKey="likes" stackId="2" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.3} name="Likes" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="pt-4 text-center">
                  <Eye className="h-6 w-6 mx-auto text-blue-500 mb-2" />
                  <div className="text-2xl font-bold">{stats.totalViews}</div>
                  <div className="text-xs text-muted-foreground">Total Views</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <Heart className="h-6 w-6 mx-auto text-red-500 mb-2" />
                  <div className="text-2xl font-bold">{stats.totalLikes}</div>
                  <div className="text-xs text-muted-foreground">Total Likes</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <MessageCircle className="h-6 w-6 mx-auto text-green-500 mb-2" />
                  <div className="text-2xl font-bold">{stats.totalComments}</div>
                  <div className="text-xs text-muted-foreground">Comments</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <Users className="h-6 w-6 mx-auto text-purple-500 mb-2" />
                  <div className="text-2xl font-bold">{stats.connectionsCount}</div>
                  <div className="text-xs text-muted-foreground">Connections</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="content" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">Posts</span>
                    <Badge>{stats.postsCount}</Badge>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Views</span><span>{stats.totalViews}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Likes</span><span>{stats.totalLikes}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Comments</span><span>{stats.totalComments}</span></div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">Stories</span>
                    <Badge>{stats.storiesCount}</Badge>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Total Views</span><span>{stats.storyViews}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Avg Views</span><span>{stats.storiesCount > 0 ? Math.round(stats.storyViews / stats.storiesCount) : 0}</span></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {charts.contentBreakdown.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Content Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={charts.contentBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {charts.contentBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="business" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate('/jobs')}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Briefcase className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <div className="font-semibold">Jobs/Gigs</div>
                      <div className="text-xs text-muted-foreground">Posted: {stats.jobsPosted}</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Applications sent: {stats.jobApplications}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto mt-2" />
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate('/courses')}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                      <GraduationCap className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <div className="font-semibold">Courses</div>
                      <div className="text-xs text-muted-foreground">Created: {stats.coursesCreated}</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Enrollments: {stats.courseEnrollments}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto mt-2" />
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate('/digital-products')}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <ShoppingBag className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <div className="font-semibold">Products</div>
                      <div className="text-xs text-muted-foreground">Created: {stats.productsCreated}</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Sales: {stats.productSales}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto mt-2" />
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate('/expert-class')}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <Video className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <div className="font-semibold">Classes</div>
                      <div className="text-xs text-muted-foreground">Created: {stats.classesCreated}</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Participants: {stats.classParticipants}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto mt-2" />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="earnings" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Earnings vs Spending (7 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={charts.earningsTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="earned" fill="hsl(var(--chart-2))" name="Earned" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="spent" fill="hsl(var(--destructive))" name="Spent" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {charts.revenueBreakdown.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Revenue Sources</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={charts.revenueBreakdown}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, value }) => `${name}: ₦${value}`}
                        dataKey="value"
                      >
                        {charts.revenueBreakdown.map((entry, index) => (
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
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
