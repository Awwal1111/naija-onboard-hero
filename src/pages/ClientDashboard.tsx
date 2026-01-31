import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Users, Briefcase, Clock, DollarSign, 
  CheckCircle, AlertCircle, MessageCircle, Star, Plus,
  TrendingUp, Calendar, Eye, Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface HiredFreelancer {
  id: string;
  freelancer_id: string;
  freelancer_name: string;
  freelancer_picture?: string;
  freelancer_profession?: string;
  gig_title: string;
  gig_id: string;
  status: string;
  amount: number;
  created_at: string;
  delivered_at?: string;
}

interface PostedJob {
  id: string;
  title: string;
  status: string;
  budget_min?: number;
  budget_max?: number;
  applications_count: number;
  views_count: number;
  created_at: string;
}

const ClientDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [hiredFreelancers, setHiredFreelancers] = useState<HiredFreelancer[]>([]);
  const [postedJobs, setPostedJobs] = useState<PostedJob[]>([]);
  const [stats, setStats] = useState({
    totalSpent: 0,
    activeOrders: 0,
    completedOrders: 0,
    postedJobs: 0,
    totalApplications: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchClientData();
    }
  }, [user?.id]);

  const fetchClientData = async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // Fetch gig orders where user is the buyer
      const { data: orders } = await supabase
        .from('gig_orders')
        .select(`
          id,
          seller_id,
          gig_id,
          status,
          amount,
          created_at,
          delivered_at,
          jobs_services!inner(title),
          profiles!gig_orders_seller_id_fkey(full_name, profile_picture_url, profession)
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      const formattedOrders: HiredFreelancer[] = (orders || []).map((order: any) => ({
        id: order.id,
        freelancer_id: order.seller_id,
        freelancer_name: order.profiles?.full_name || 'Freelancer',
        freelancer_picture: order.profiles?.profile_picture_url,
        freelancer_profession: order.profiles?.profession,
        gig_title: order.jobs_services?.title || 'Service',
        gig_id: order.gig_id,
        status: order.status,
        amount: order.amount,
        created_at: order.created_at,
        delivered_at: order.delivered_at
      }));

      setHiredFreelancers(formattedOrders);

      // Fetch posted jobs
      const { data: jobs } = await supabase
        .from('job_posts')
        .select('id, title, status, budget_min, budget_max, applications_count, views_count, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setPostedJobs(jobs || []);

      // Calculate stats
      const activeOrders = formattedOrders.filter(o => 
        ['pending', 'in_progress', 'delivered'].includes(o.status)
      ).length;
      const completedOrders = formattedOrders.filter(o => o.status === 'completed').length;
      const totalSpent = formattedOrders
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + o.amount, 0);
      const totalApplications = (jobs || []).reduce((sum, j) => sum + (j.applications_count || 0), 0);

      setStats({
        totalSpent,
        activeOrders,
        completedOrders,
        postedJobs: jobs?.length || 0,
        totalApplications
      });

    } catch (error) {
      console.error('Error fetching client data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'in_progress': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'delivered': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'pending': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">Client Dashboard</h1>
              <p className="text-xs text-muted-foreground">Manage your hiring activity</p>
            </div>
          </div>
          <Button onClick={() => navigate('/jobs')} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Post Job</span>
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="h-6 w-6 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold">₦{stats.totalSpent.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Spent</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-6 w-6 mx-auto text-blue-500 mb-2" />
              <p className="text-2xl font-bold">{stats.activeOrders}</p>
              <p className="text-xs text-muted-foreground">Active Orders</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-6 w-6 mx-auto text-green-500 mb-2" />
              <p className="text-2xl font-bold">{stats.completedOrders}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Briefcase className="h-6 w-6 mx-auto text-purple-500 mb-2" />
              <p className="text-2xl font-bold">{stats.postedJobs}</p>
              <p className="text-xs text-muted-foreground">Jobs Posted</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="freelancers" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="freelancers" className="gap-2">
              <Users className="h-4 w-4" />
              Hired Freelancers
            </TabsTrigger>
            <TabsTrigger value="jobs" className="gap-2">
              <Briefcase className="h-4 w-4" />
              My Job Posts
            </TabsTrigger>
          </TabsList>

          {/* Hired Freelancers Tab */}
          <TabsContent value="freelancers" className="mt-4 space-y-3">
            {hiredFreelancers.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No Freelancers Hired Yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Browse services and hire talented freelancers
                  </p>
                  <Button onClick={() => navigate('/jobs?tab=gigs')}>
                    <Package className="h-4 w-4 mr-2" />
                    Browse Services
                  </Button>
                </CardContent>
              </Card>
            ) : (
              hiredFreelancers.map((freelancer) => (
                <Card key={freelancer.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={freelancer.freelancer_picture} />
                        <AvatarFallback>
                          {freelancer.freelancer_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 
                              className="font-semibold cursor-pointer hover:text-primary"
                              onClick={() => navigate(`/expert/${freelancer.freelancer_id}`)}
                            >
                              {freelancer.freelancer_name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {freelancer.freelancer_profession}
                            </p>
                          </div>
                          <Badge className={getStatusColor(freelancer.status)}>
                            {freelancer.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        
                        <p 
                          className="text-sm mt-2 cursor-pointer hover:text-primary"
                          onClick={() => navigate(`/gig/${freelancer.gig_id}`)}
                        >
                          📦 {freelancer.gig_title}
                        </p>
                        
                        <div className="flex items-center justify-between mt-3 pt-3 border-t">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">
                              ₦{freelancer.amount.toLocaleString()}
                            </span>
                            <span>
                              {formatDistanceToNow(new Date(freelancer.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8"
                              onClick={() => navigate(`/order/${freelancer.id}`)}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View Order
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8"
                              onClick={() => navigate(`/chat/${freelancer.freelancer_id}`)}
                            >
                              <MessageCircle className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Job Posts Tab */}
          <TabsContent value="jobs" className="mt-4 space-y-3">
            {postedJobs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No Jobs Posted Yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Post a job to find talented freelancers
                  </p>
                  <Button onClick={() => navigate('/jobs')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Post a Job
                  </Button>
                </CardContent>
              </Card>
            ) : (
              postedJobs.map((job) => (
                <Card 
                  key={job.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/job/${job.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{job.title}</h3>
                          <Badge className={getStatusColor(job.status)}>
                            {job.status}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {job.budget_min && job.budget_max && (
                            <span className="font-medium text-foreground">
                              ₦{job.budget_min.toLocaleString()} - ₦{job.budget_max.toLocaleString()}
                            </span>
                          )}
                          <span>
                            {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 mt-4 pt-3 border-t">
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="font-medium">{job.applications_count || 0}</span>
                        <span className="text-muted-foreground">applications</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <span>{job.views_count || 0}</span>
                        <span className="text-muted-foreground">views</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => navigate('/ai-hire')}
              >
                <Star className="h-5 w-5 text-primary" />
                <span className="text-sm">AI Hire Assistant</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => navigate('/experts')}
              >
                <Users className="h-5 w-5 text-primary" />
                <span className="text-sm">Browse Experts</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => navigate('/orders')}
              >
                <Package className="h-5 w-5 text-primary" />
                <span className="text-sm">All Orders</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => navigate('/jobs?tab=gigs')}
              >
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="text-sm">Top Services</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientDashboard;
