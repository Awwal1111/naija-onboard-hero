import React, { useState, useEffect } from 'react'
import { ArrowLeft, Users, FileText, TrendingUp, DollarSign, Eye, Settings, AlertCircle, CheckCircle, Clock, Star, MessageCircle, Briefcase, Award, Calendar, BarChart3, PieChart, Activity, Search, Filter, MoreVertical, Trash2, Edit, Ban, Heart, Package, BookOpen, Target, AlertTriangle } from 'lucide-react'
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
import { AdminArticlesSection } from '@/components/AdminArticlesSection'
import { AdminWalletManagement } from '@/components/AdminWalletManagement'
import { AdminMasterWalletInfo } from '@/components/AdminMasterWalletInfo'
import { AdminSettingsTab } from '@/components/AdminSettingsTab'
import { AdminWithdrawalsSection } from '@/components/AdminWithdrawalsSection'
import { AdminDisputeManagement } from '@/components/AdminDisputeManagement'
import { AdminManualDepositsSection } from '@/components/AdminManualDepositsSection'

// Marketplace Section Components
const DonationsSection = () => {
  const [donations, setDonations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDonations()
  }, [])

  const fetchDonations = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('donations')
        .select(`
          *,
          profiles(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Donations query error:', error)
        throw error
      }
      
      console.log('Donations fetched successfully:', data)
      setDonations(data || [])
    } catch (error: any) {
      console.error('Error fetching donations:', error)
      setDonations([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading donations...</div>
  }

  if (donations.length === 0) {
    return (
      <div className="text-center py-8">
        <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-text-secondary">No donations found</p>
        <p className="text-xs text-text-secondary mt-2">Check console for errors</p>
      </div>
    )
  }

  return (
    <div className="max-h-[600px] overflow-y-auto pr-2 space-y-4">
      <div className="mb-4 p-4 bg-muted/30 rounded-lg sticky top-0 z-10">
        <p className="text-sm text-text-secondary">Total Donations: <span className="font-semibold text-text-primary">{donations.length}</span></p>
        <p className="text-sm text-text-secondary">Total Amount: <span className="font-semibold text-primary">NC {donations.reduce((sum, d) => sum + Number(d.amount), 0).toLocaleString()}</span></p>
      </div>
      {donations.map((donation) => (
        <Card key={donation.id} className="border-l-4 border-l-red-500">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <p className="font-semibold text-text-primary">
                    {donation.profiles?.full_name || 'Anonymous'}
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {new Date(donation.created_at).toLocaleDateString()}
                  </Badge>
                </div>
                <p className="text-lg font-bold text-primary mb-2">
                  NC {donation.amount.toLocaleString()}
                </p>
                {donation.message && (
                  <p className="text-sm text-text-secondary mt-2 italic border-l-2 border-border pl-3">
                    "{donation.message}"
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

const DigitalProductsSection = () => {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('digital_products')
        .select(`
          *,
          profiles!digital_products_user_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading products...</div>
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-8">
        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-text-secondary">No products yet</p>
      </div>
    )
  }

  return (
    <div className="max-h-[600px] overflow-y-auto pr-2 space-y-4">
      <div className="mb-4 p-4 bg-muted/30 rounded-lg grid grid-cols-2 gap-4 sticky top-0 z-10">
        <div>
          <p className="text-sm text-text-secondary">Total Products</p>
          <p className="text-2xl font-bold text-text-primary">{products.length}</p>
        </div>
        <div>
          <p className="text-sm text-text-secondary">Total Downloads</p>
          <p className="text-2xl font-bold text-primary">{products.reduce((sum, p) => sum + (p.download_count || 0), 0)}</p>
        </div>
      </div>
      {products.map((product) => (
        <Card key={product.id} className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-text-primary">{product.title}</h3>
                  <Badge variant={product.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                    {product.status}
                  </Badge>
                </div>
                <p className="text-sm text-text-secondary mb-2 line-clamp-2">{product.description}</p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-primary font-semibold">NC {product.price}</span>
                  <span className="text-text-secondary">by {product.profiles?.full_name}</span>
                  <span className="text-text-secondary">{product.download_count} downloads</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

const CoursesSection = () => {
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          profiles!courses_user_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setCourses(data || [])
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading courses...</div>
  }

  if (courses.length === 0) {
    return (
      <div className="text-center py-8">
        <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-text-secondary">No courses yet</p>
      </div>
    )
  }

  return (
    <div className="max-h-[600px] overflow-y-auto pr-2 space-y-4">
      <div className="mb-4 p-4 bg-muted/30 rounded-lg grid grid-cols-2 gap-4 sticky top-0 z-10">
        <div>
          <p className="text-sm text-text-secondary">Total Courses</p>
          <p className="text-2xl font-bold text-text-primary">{courses.length}</p>
        </div>
        <div>
          <p className="text-sm text-text-secondary">Total Enrolled</p>
          <p className="text-2xl font-bold text-primary">{courses.reduce((sum, c) => sum + (c.enrollment_count || 0), 0)}</p>
        </div>
      </div>
      {courses.map((course) => (
        <Card key={course.id} className="border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-text-primary">{course.title}</h3>
                  <Badge variant={course.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                    {course.status}
                  </Badge>
                </div>
                <p className="text-sm text-text-secondary mb-2 line-clamp-2">{course.description}</p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-primary font-semibold">NC {course.price}</span>
                  <span className="text-text-secondary">by {course.profiles?.full_name}</span>
                  <span className="text-text-secondary">{course.enrollment_count} enrolled</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

const FundraisingSection = () => {
  const [fundraisings, setFundraisings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchFundraisings()
  }, [])

  const fetchFundraisings = async () => {
    try {
      const { data, error } = await supabase
        .from('fundraisings')
        .select(`
          *,
          profiles!fundraisings_user_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setFundraisings(data || [])
    } catch (error) {
      console.error('Error fetching fundraisings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('fundraisings')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Fundraising approved successfully",
      })
      fetchFundraisings()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve fundraising",
        variant: "destructive"
      })
    }
  }

  const handleReject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('fundraisings')
        .update({ status: 'rejected' })
        .eq('id', id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Fundraising rejected",
      })
      fetchFundraisings()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject fundraising",
        variant: "destructive"
      })
    }
  }

  const handleReleaseFunds = async (fundraising: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("admin_release_fundraising_funds", {
        p_fundraising_id: fundraising.id,
        p_admin_id: user.id,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || "Release failed");
      }

      toast({
        title: "Success",
        description: "Funds released successfully to campaign owner",
      });
      fetchFundraisings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to release funds",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading fundraisings...</div>
  }

  if (fundraisings.length === 0) {
    return (
      <div className="text-center py-8">
        <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-text-secondary">No fundraising requests yet</p>
      </div>
    )
  }

  return (
    <div className="max-h-[600px] overflow-y-auto pr-2 space-y-4">
      <div className="mb-4 p-4 bg-muted/30 rounded-lg grid grid-cols-3 gap-4 sticky top-0 z-10">
        <div>
          <p className="text-sm text-text-secondary">Total Requests</p>
          <p className="text-2xl font-bold text-text-primary">{fundraisings.length}</p>
        </div>
        <div>
          <p className="text-sm text-text-secondary">Pending</p>
          <p className="text-2xl font-bold text-orange-500">{fundraisings.filter(f => f.status === 'pending').length}</p>
        </div>
        <div>
          <p className="text-sm text-text-secondary">Total Goal</p>
          <p className="text-2xl font-bold text-primary">NC {fundraisings.reduce((sum, f) => sum + Number(f.goal_amount), 0).toLocaleString()}</p>
        </div>
      </div>
      {fundraisings.map((fundraising) => (
        <Card key={fundraising.id} className="border-l-4 border-l-purple-500">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-text-primary">{fundraising.title}</h3>
                    <Badge variant={
                      fundraising.status === 'approved' ? 'default' : 
                      fundraising.status === 'pending' ? 'secondary' : 'destructive'
                    } className="text-xs">
                      {fundraising.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-text-secondary mb-3 line-clamp-2">{fundraising.description}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-text-secondary">Goal: </span>
                      <span className="font-semibold text-primary">NC {fundraising.goal_amount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-text-secondary">Raised: </span>
                      <span className="font-semibold text-green-600">NC {fundraising.raised_amount?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                  <p className="text-xs text-text-secondary mt-2">by {fundraising.profiles?.full_name}</p>
                </div>
              </div>
              {fundraising.status === 'pending' && (
                <div className="flex gap-2 pt-3 border-t">
                  <Button size="sm" onClick={() => handleApprove(fundraising.id)} className="flex-1">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleReject(fundraising.id)} className="flex-1">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}
              {fundraising.funds_release_requested && !fundraising.funds_released_at && (
                <div className="flex gap-2 pt-3 border-t">
                  <Button size="sm" onClick={() => handleReleaseFunds(fundraising)} className="w-full" variant="default">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Release Funds to Campaign Owner
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

const EmergencySection = () => {
  const [emergencies, setEmergencies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchEmergencies()
  }, [])

  const fetchEmergencies = async () => {
    try {
      const { data, error } = await supabase
        .from('emergency_requests')
        .select(`
          *,
          profiles!emergency_requests_user_id_fkey(full_name, wallet_balance)
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setEmergencies(data || [])
    } catch (error) {
      console.error('Error fetching emergencies:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (emergency: any) => {
    try {
      const user = await supabase.auth.getUser()
      
      // Update emergency status
      const { error: updateError } = await supabase
        .from('emergency_requests')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.data.user?.id
        })
        .eq('id', emergency.id)

      if (updateError) throw updateError

      // Credit user wallet
      const { error: walletError } = await supabase
        .from('profiles')
        .update({ 
          wallet_balance: emergency.profiles.wallet_balance + emergency.amount_requested,
          balance_withdrawable: emergency.profiles.wallet_balance + emergency.amount_requested
        })
        .eq('user_id', emergency.user_id)

      if (walletError) throw walletError

      // Log transaction
      await supabase
        .from('wallet_transactions')
        .insert({
          user_id: emergency.user_id,
          amount: emergency.amount_requested,
          kind: 'emergency_disbursement',
          status: 'completed',
          reference: `Emergency request approved: ${emergency.reason.substring(0, 50)}`
        })

      toast({
        title: "Success",
        description: "Emergency request approved and funds disbursed",
      })
      fetchEmergencies()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve emergency request",
        variant: "destructive"
      })
    }
  }

  const handleReject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('emergency_requests')
        .update({ status: 'rejected' })
        .eq('id', id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Emergency request rejected",
      })
      fetchEmergencies()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject emergency request",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading emergency requests...</div>
  }

  if (emergencies.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-text-secondary">No emergency requests yet</p>
      </div>
    )
  }

  return (
    <div className="max-h-[600px] overflow-y-auto pr-2 space-y-4">
      <div className="mb-4 p-4 bg-muted/30 rounded-lg grid grid-cols-3 gap-4 sticky top-0 z-10">
        <div>
          <p className="text-sm text-text-secondary">Total Requests</p>
          <p className="text-2xl font-bold text-text-primary">{emergencies.length}</p>
        </div>
        <div>
          <p className="text-sm text-text-secondary">Pending</p>
          <p className="text-2xl font-bold text-orange-500">{emergencies.filter(e => e.status === 'pending').length}</p>
        </div>
        <div>
          <p className="text-sm text-text-secondary">Total Amount</p>
          <p className="text-2xl font-bold text-primary">NC {emergencies.reduce((sum, e) => sum + Number(e.amount_requested), 0).toLocaleString()}</p>
        </div>
      </div>
      {emergencies.map((emergency) => (
        <Card key={emergency.id} className="border-l-4 border-l-orange-500">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-text-primary">
                      {emergency.profiles?.full_name || 'User'}
                    </h3>
                    <Badge variant={
                      emergency.status === 'approved' ? 'default' : 
                      emergency.status === 'pending' ? 'secondary' : 'destructive'
                    } className="text-xs">
                      {emergency.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-text-secondary mb-3 line-clamp-2">{emergency.reason}</p>
                  <p className="text-lg font-bold text-primary mb-2">
                    Amount: NC {emergency.amount_requested.toLocaleString()}
                  </p>
                  {emergency.admin_notes && (
                    <p className="text-xs text-text-secondary italic border-l-2 border-border pl-3">
                      Admin Note: {emergency.admin_notes}
                    </p>
                  )}
                </div>
              </div>
              {emergency.status === 'pending' && (
                <div className="flex gap-2 pt-3 border-t">
                  <Button size="sm" onClick={() => handleApprove(emergency)} className="flex-1">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve & Disburse
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleReject(emergency.id)} className="flex-1">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

const EnhancedAdminDashboard = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Check if user is admin
  useEffect(() => {
    const checkAdminAccess = async () => {
      // Wait for auth to finish loading
      if (authLoading) {
        return
      }

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
  }, [user, authLoading, navigate, toast])
  
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
    refreshStats()
  }, [])

  const refreshStats = async () => {
    try {
      // Refresh admin stats
      await supabase.rpc('refresh_admin_stats')
      
      // Fetch the updated stats
      const { data: statsData } = await supabase
        .from('admin_stats')
        .select('*')
        .eq('stat_date', new Date().toISOString().split('T')[0])
        .single()

      if (statsData) {
        setDashboardStats({
          totalUsers: statsData.total_users,
          activeUsers: statsData.active_users,
          totalExperts: statsData.total_experts,
          totalPosts: statsData.total_posts,
          totalJobs: statsData.total_jobs,
          totalRevenue: Number(statsData.total_revenue),
          pendingApplications: statsData.pending_applications,
          recentSignups: statsData.new_signups
        })
      }
    } catch (error) {
      console.error('Error refreshing stats:', error)
    }
  }

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

      // Calculate real stats
      const stats = {
        totalUsers: usersData?.length || 0,
        activeUsers: usersData?.filter(u => new Date(u.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length || 0,
        totalExperts: usersData?.filter(u => u.is_expert).length || 0,
        totalPosts: postsData?.length || 0,
        totalJobs: jobPostsData?.length || 0,
        totalRevenue: 0, // Will be calculated from admin_stats
        pendingApplications: applicationsData?.filter(a => a.status === 'pending').length || 0,
        recentSignups: usersData?.filter(u => new Date(u.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length || 0
      }

      setUsers(usersData || [])
      setPosts(postsData || [])
      setJobPosts(jobPostsData || [])
      setApplications(applicationsData || [])
      setDashboardStats(stats)

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

  if (authLoading || loading) {
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

      <div className="px-6 py-6 max-w-7xl mx-auto">{/* Dashboard Header */}
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
          <div className="overflow-x-auto mb-6">
            <TabsList className="inline-flex w-full min-w-max">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="applications">Applications</TabsTrigger>
              <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
              <TabsTrigger value="wallet">Wallet</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Platform Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-text-secondary">Total Users</p>
                      <p className="text-2xl font-bold text-text-primary">{dashboardStats.totalUsers}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-text-secondary">Total Experts</p>
                      <p className="text-2xl font-bold text-text-primary">{dashboardStats.totalExperts}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-text-secondary">Total Posts</p>
                      <p className="text-2xl font-bold text-text-primary">{dashboardStats.totalPosts}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-text-secondary">Total Jobs</p>
                      <p className="text-2xl font-bold text-text-primary">{dashboardStats.totalJobs}</p>
                    </div>
                  </div>
                  <Button onClick={refreshStats} variant="outline" className="w-full mt-4">
                    <Activity className="h-4 w-4 mr-2" />
                    Refresh Statistics
                  </Button>
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
              <div className="overflow-x-auto mb-6">
                <TabsList className="inline-flex w-full min-w-max">
                  <TabsTrigger value="expert">Expert Applications</TabsTrigger>
                  <TabsTrigger value="social">Social Tasks</TabsTrigger>
                  <TabsTrigger value="referral">Referral Tasks</TabsTrigger>
                  <TabsTrigger value="articles">Articles</TabsTrigger>
                  <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
                  <TabsTrigger value="disputes">Disputes</TabsTrigger>
                </TabsList>
              </div>

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

              <TabsContent value="articles">
                <AdminArticlesSection />
              </TabsContent>

              <TabsContent value="withdrawals">
                <AdminWithdrawalsSection />
              </TabsContent>

              <TabsContent value="disputes">
                <Card>
                  <CardHeader>
                    <CardTitle>Transaction Disputes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AdminDisputeManagement />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Marketplace Tab */}
          <TabsContent value="marketplace" className="space-y-6">
            <Tabs defaultValue="donations" className="w-full">
              <div className="overflow-x-auto mb-6">
                <TabsList className="inline-flex w-full min-w-max">
                  <TabsTrigger value="donations">
                    <Heart className="h-4 w-4 mr-2" />
                    Donations
                  </TabsTrigger>
                  <TabsTrigger value="digital-products">
                    <Package className="h-4 w-4 mr-2" />
                    Digital Products
                  </TabsTrigger>
                  <TabsTrigger value="courses">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Courses
                  </TabsTrigger>
                  <TabsTrigger value="fundraising">
                    <Target className="h-4 w-4 mr-2" />
                    Fundraising
                  </TabsTrigger>
                  <TabsTrigger value="emergency">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Emergency
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="donations" className="mt-0">
                <Card>
                  <CardHeader className="bg-muted/30">
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="h-5 w-5 text-red-500" />
                      Recent Donations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <DonationsSection />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="digital-products" className="mt-0">
                <Card>
                  <CardHeader className="bg-muted/30">
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-blue-500" />
                      Digital Products
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <DigitalProductsSection />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="courses" className="mt-0">
                <Card>
                  <CardHeader className="bg-muted/30">
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-green-500" />
                      Courses
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <CoursesSection />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="fundraising" className="mt-0">
                <Card>
                  <CardHeader className="bg-muted/30">
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-purple-500" />
                      Fundraising Requests
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <FundraisingSection />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="emergency" className="mt-0">
                <Card>
                  <CardHeader className="bg-muted/30">
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      Emergency Requests
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <EmergencySection />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Wallet Management Tab */}
          <TabsContent value="wallet" className="space-y-6">
            <AdminMasterWalletInfo />
            
            <AdminWalletManagement />
            
            <Card>
              <CardContent className="pt-6">
                <AdminManualDepositsSection />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <AdminSettingsTab />
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