import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, TrendingUp, Eye, DollarSign, Users, Briefcase, Award, 
  Heart, MessageCircle, ShoppingBag, GraduationCap, Video, Star,
  ArrowUpRight, ArrowDownRight, Wallet, Shield, ChevronRight, ArrowLeft
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTrustScore } from '@/hooks/useTrustScore';
import { ProfileVisitorsCard } from '@/components/dashboard/ProfileVisitorsCard';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

const COLORS = ['hsl(var(--primary))', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    totalSpent: 0,
    walletBalance: 0,
    postsCount: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    storiesCount: 0,
    storyViews: 0,
    jobsPosted: 0,
    jobApplications: 0,
    coursesCreated: 0,
    courseEnrollments: 0,
    courseRevenue: 0,
    productsCreated: 0,
    productSales: 0,
    productRevenue: 0,
    fundraisingsCreated: 0,
    fundraisingRaised: 0,
    classesCreated: 0,
    classParticipants: 0,
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
      // Fetch profile with only needed fields
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_id, full_name, profile_picture_url, email_verified, phone_verified, face_verified, average_rating, rating_count, created_at, avg_response_time_seconds, connections_count, is_expert, wallet_balance, profession')
        .eq('user_id', user?.id)
        .single();
      
      setProfile(profileData);

      // Use lightweight COUNT queries + only needed columns to reduce egress
      const [
        postsRes,
        storiesRes,
        storyViewsRes,
        transactionsRes,
        jobsRes,
        jobAppsRes,
        coursesRes,
        courseEnrollmentsRes,
        productsRes,
        productPurchasesRes,
        fundraisingsRes,
        contributionsRes,
        classesRes,
        classParticipantsRes,
        ratingsRes
      ] = await Promise.all([
        supabase.from('posts').select('id, views_count, likes_count, comments_count').eq('user_id', user?.id),
        supabase.from('stories').select('id', { count: 'exact', head: true }).eq('user_id', user?.id),
        supabase.from('story_views').select('id', { count: 'exact', head: true }).eq('user_id', user?.id),
        supabase.from('wallet_transactions').select('amount, kind, created_at').eq('user_id', user?.id).order('created_at', { ascending: false }).limit(200),
        supabase.from('job_posts').select('id', { count: 'exact', head: true }).eq('user_id', user?.id),
        supabase.from('job_post_applications').select('id', { count: 'exact', head: true }).eq('applicant_id', user?.id),
        supabase.from('courses').select('id', { count: 'exact', head: true }).eq('user_id', user?.id),
        supabase.from('course_enrollments').select('amount, courses!inner(user_id)').eq('courses.user_id', user?.id),
        supabase.from('digital_products').select('id', { count: 'exact', head: true }).eq('user_id', user?.id),
        supabase.from('digital_product_purchases').select('amount, digital_products!inner(user_id)').eq('digital_products.user_id', user?.id),
        supabase.from('fundraisings').select('id', { count: 'exact', head: true }).eq('user_id', user?.id),
        supabase.from('fundraising_contributions').select('amount, fundraisings!inner(user_id)').eq('fundraisings.user_id', user?.id),
        supabase.from('expert_classes').select('id', { count: 'exact', head: true }).eq('expert_id', user?.id),
        supabase.from('class_participants').select('id, expert_classes!inner(expert_id)').eq('expert_classes.expert_id', user?.id),
        supabase.from('expert_ratings').select('rating').eq('expert_id', user?.id)
      ]);

      const posts = postsRes.data || [];
      const transactions = transactionsRes.data || [];
      
      // Calculate stats from lightweight data
      const totalEarnings = transactions.filter((t: any) => t.amount > 0).reduce((sum: number, t: any) => sum + t.amount, 0);
      const totalSpent = Math.abs(transactions.filter((t: any) => t.amount < 0).reduce((sum: number, t: any) => sum + t.amount, 0));
      
      const postStats = posts.reduce((acc: any, p: any) => ({
        views: acc.views + (p.views_count || 0),
        likes: acc.likes + (p.likes_count || 0),
        comments: acc.comments + (p.comments_count || 0)
      }), { views: 0, likes: 0, comments: 0 });
      
      const courseRevenue = (courseEnrollmentsRes.data || []).reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
      const productRevenue = (productPurchasesRes.data || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      const fundraisingRaised = (contributionsRes.data || []).reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
      const ratings = ratingsRes.data || [];
      const avgRating = ratings.length ? ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length : 0;

      setStats({
        totalEarnings,
        totalSpent,
        walletBalance: profileData?.wallet_balance || 0,
        postsCount: posts.length,
        totalViews: postStats.views,
        totalLikes: postStats.likes,
        totalComments: postStats.comments,
        storiesCount: (storiesRes.data || []).length,
        storyViews: (storyViewsRes.data || []).length,
        jobsPosted: (jobsRes.data || []).length,
        jobApplications: (jobAppsRes.data || []).length,
        coursesCreated: (coursesRes.data || []).length,
        courseEnrollments: (courseEnrollmentsRes.data || []).length,
        courseRevenue,
        productsCreated: (productsRes.data || []).length,
        productSales: (productPurchasesRes.data || []).length,
        productRevenue,
        fundraisingsCreated: (fundraisingsRes.data || []).length,
        fundraisingRaised,
        classesCreated: (classesRes.data || []).length,
        classParticipants: (classParticipantsRes.data || []).length,
        connectionsCount: profileData?.connections_count || 0,
        avgRating,
        ratingCount: ratings.length
      });

      // Build charts
      const earningsTrend = [];
      const engagementTrend = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayTransactions = transactions.filter(t => t.created_at?.startsWith(dateStr));
        const earned = dayTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
        const spent = Math.abs(dayTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));
        
        const dayPosts = posts.filter(p => p.created_at?.startsWith(dateStr));
        
        earningsTrend.push({
          date: date.toLocaleDateString('en-US', { weekday: 'short' }),
          earned,
          spent
        });
        
        engagementTrend.push({
          date: date.toLocaleDateString('en-US', { weekday: 'short' }),
          likes: dayPosts.reduce((sum, p) => sum + (p.likes_count || 0), 0),
          views: dayPosts.reduce((sum, p) => sum + (p.views_count || 0), 0)
        });
      }

      const contentBreakdown = [
        { name: 'Posts', value: posts.length },
        { name: 'Stories', value: (storiesRes.data || []).length },
        { name: 'Jobs', value: (jobsRes.data || []).length },
        { name: 'Courses', value: (coursesRes.data || []).length },
        { name: 'Products', value: (productsRes.data || []).length }
      ].filter(item => item.value > 0);

      const revenueBreakdown = [
        { name: 'Courses', value: courseRevenue },
        { name: 'Products', value: productRevenue },
        { name: 'Fundraising', value: fundraisingRaised }
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
    { label: 'My Classes', path: '/experts', icon: Video, count: stats.classesCreated, color: 'bg-purple-500/10 text-purple-500' },
    { label: 'Fundraising', path: '/fundraising', icon: Heart, count: stats.fundraisingsCreated, color: 'bg-red-500/10 text-red-500' },
    { label: 'Wallet', path: '/profile', icon: Wallet, count: stats.walletBalance, color: 'bg-emerald-500/10 text-emerald-500' }
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">Dashboard</h1>
              <p className="text-xs text-muted-foreground">Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}</p>
            </div>
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
              <div><div className="font-semibold">{trustScore.breakdown.verification}</div><div className="text-muted-foreground">Verify</div></div>
              <div><div className="font-semibold">{trustScore.breakdown.reputation}</div><div className="text-muted-foreground">Rep</div></div>
              <div><div className="font-semibold">{trustScore.breakdown.activity}</div><div className="text-muted-foreground">Activity</div></div>
              <div><div className="font-semibold">{trustScore.breakdown.community}</div><div className="text-muted-foreground">Social</div></div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-emerald-500/10 rounded-lg"><Wallet className="h-4 w-4 text-emerald-500" /></div>
                <span className="text-xs text-muted-foreground">Balance</span>
              </div>
              <div className="text-xl font-bold">₦{stats.walletBalance.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-green-500/10 rounded-lg"><ArrowUpRight className="h-4 w-4 text-green-500" /></div>
                <span className="text-xs text-muted-foreground">Earned</span>
              </div>
              <div className="text-xl font-bold text-green-600">+₦{stats.totalEarnings.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-red-500/10 rounded-lg"><ArrowDownRight className="h-4 w-4 text-red-500" /></div>
                <span className="text-xs text-muted-foreground">Spent</span>
              </div>
              <div className="text-xl font-bold text-red-600">-₦{stats.totalSpent.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-yellow-500/10 rounded-lg"><Star className="h-4 w-4 text-yellow-500" /></div>
                <span className="text-xs text-muted-foreground">Rating</span>
              </div>
              <div className="text-xl font-bold">{stats.avgRating.toFixed(1)} <span className="text-xs text-muted-foreground">({stats.ratingCount})</span></div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Quick Access</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {quickActions.map((action) => (
                <button key={action.path} onClick={() => navigate(action.path)} className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-accent transition-colors">
                  <div className={`p-3 rounded-xl ${action.color}`}><action.icon className="h-5 w-5" /></div>
                  <span className="text-xs font-medium text-center">{action.label}</span>
                  {action.count > 0 && <Badge variant="secondary" className="text-xs">{action.count}</Badge>}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="business">Business</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Profile Visitors Card */}
            <ProfileVisitorsCard />

            {charts.engagementTrend.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" />Engagement (7 Days)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={charts.engagementTrend}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} name="Views" />
                      <Area type="monotone" dataKey="likes" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} name="Likes" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card><CardContent className="pt-4 text-center"><Eye className="h-6 w-6 mx-auto text-blue-500 mb-2" /><div className="text-2xl font-bold">{stats.totalViews}</div><div className="text-xs text-muted-foreground">Views</div></CardContent></Card>
              <Card><CardContent className="pt-4 text-center"><Heart className="h-6 w-6 mx-auto text-red-500 mb-2" /><div className="text-2xl font-bold">{stats.totalLikes}</div><div className="text-xs text-muted-foreground">Likes</div></CardContent></Card>
              <Card><CardContent className="pt-4 text-center"><MessageCircle className="h-6 w-6 mx-auto text-green-500 mb-2" /><div className="text-2xl font-bold">{stats.totalComments}</div><div className="text-xs text-muted-foreground">Comments</div></CardContent></Card>
              <Card><CardContent className="pt-4 text-center"><Users className="h-6 w-6 mx-auto text-purple-500 mb-2" /><div className="text-2xl font-bold">{stats.connectionsCount}</div><div className="text-xs text-muted-foreground">Connections</div></CardContent></Card>
            </div>
          </TabsContent>

          <TabsContent value="content" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <Card><CardContent className="pt-4"><div className="flex items-center justify-between mb-3"><span className="text-sm font-medium">Posts</span><Badge>{stats.postsCount}</Badge></div><div className="space-y-1 text-xs"><div className="flex justify-between"><span className="text-muted-foreground">Views</span><span>{stats.totalViews}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Likes</span><span>{stats.totalLikes}</span></div></div></CardContent></Card>
              <Card><CardContent className="pt-4"><div className="flex items-center justify-between mb-3"><span className="text-sm font-medium">Stories</span><Badge>{stats.storiesCount}</Badge></div><div className="space-y-1 text-xs"><div className="flex justify-between"><span className="text-muted-foreground">Views</span><span>{stats.storyViews}</span></div></div></CardContent></Card>
            </div>
            {charts.contentBreakdown.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Content Distribution</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart><Pie data={charts.contentBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">{charts.contentBreakdown.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip /><Legend /></PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="business" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <Card className="cursor-pointer hover:bg-accent/50" onClick={() => navigate('/jobs')}>
                <CardContent className="pt-4"><div className="flex items-center gap-3 mb-2"><div className="p-2 bg-blue-500/10 rounded-lg"><Briefcase className="h-5 w-5 text-blue-500" /></div><div><div className="font-semibold">Jobs</div><div className="text-xs text-muted-foreground">Posted: {stats.jobsPosted}</div></div></div><div className="text-xs text-muted-foreground">Applied: {stats.jobApplications}</div></CardContent>
              </Card>
              <Card className="cursor-pointer hover:bg-accent/50" onClick={() => navigate('/courses')}>
                <CardContent className="pt-4"><div className="flex items-center gap-3 mb-2"><div className="p-2 bg-orange-500/10 rounded-lg"><GraduationCap className="h-5 w-5 text-orange-500" /></div><div><div className="font-semibold">Courses</div><div className="text-xs text-muted-foreground">Created: {stats.coursesCreated}</div></div></div><div className="text-xs text-muted-foreground">Revenue: ₦{stats.courseRevenue}</div></CardContent>
              </Card>
              <Card className="cursor-pointer hover:bg-accent/50" onClick={() => navigate('/digital-products')}>
                <CardContent className="pt-4"><div className="flex items-center gap-3 mb-2"><div className="p-2 bg-green-500/10 rounded-lg"><ShoppingBag className="h-5 w-5 text-green-500" /></div><div><div className="font-semibold">Products</div><div className="text-xs text-muted-foreground">Created: {stats.productsCreated}</div></div></div><div className="text-xs text-muted-foreground">Revenue: ₦{stats.productRevenue}</div></CardContent>
              </Card>
              <Card className="cursor-pointer hover:bg-accent/50" onClick={() => navigate('/experts')}>
                <CardContent className="pt-4"><div className="flex items-center gap-3 mb-2"><div className="p-2 bg-purple-500/10 rounded-lg"><Video className="h-5 w-5 text-purple-500" /></div><div><div className="font-semibold">Classes</div><div className="text-xs text-muted-foreground">Created: {stats.classesCreated}</div></div></div><div className="text-xs text-muted-foreground">Participants: {stats.classParticipants}</div></CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="earnings" className="space-y-4 mt-4">
            {charts.earningsTrend.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" />Earnings vs Spending</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={charts.earningsTrend}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="earned" fill="#22c55e" name="Earned" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="spent" fill="#ef4444" name="Spent" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
            {charts.revenueBreakdown.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Revenue Sources</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart><Pie data={charts.revenueBreakdown} cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ₦${value}`} dataKey="value">{charts.revenueBreakdown.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip /></PieChart>
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
