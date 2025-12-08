import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, MapPin, Clock, DollarSign, Users, Briefcase, Home, MessageCircle, Menu, Plus, Search, BarChart3, Eye, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BrandInput } from '@/components/ui/brand-input'
import { useAuth } from '@/hooks/useAuth'
import { usePersonalizedJobs, PersonalizedJob } from '@/hooks/usePersonalizedDiscovery'
import { supabase } from '@/integrations/supabase/client'
import JobPostingDialog from '@/components/JobPostingDialog'
import { MoreMenuDrawer } from '@/components/MoreMenuDrawer'
import { BookmarkButton } from '@/components/BookmarkButton'

const Jobs = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { jobs, loading } = usePersonalizedJobs(50)
  const [searchQuery, setSearchQuery] = useState('')
  const [stateFilter, setStateFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('discover')
  const [myJobs, setMyJobs] = useState<any[]>([])
  const [myApplications, setMyApplications] = useState<any[]>([])
  const [stats, setStats] = useState({ posted: 0, applications: 0, views: 0 })

  useEffect(() => {
    if (user) {
      fetchMyData()
    }
  }, [user])

  const fetchMyData = async () => {
    const [jobsRes, appsRes] = await Promise.all([
      supabase.from('job_posts').select('*').eq('user_id', user?.id).order('created_at', { ascending: false }),
      supabase.from('job_post_applications').select('*, job_posts(*)').eq('applicant_id', user?.id).order('created_at', { ascending: false })
    ])
    setMyJobs(jobsRes.data || [])
    setMyApplications(appsRes.data || [])
    setStats({
      posted: jobsRes.data?.length || 0,
      applications: appsRes.data?.length || 0,
      views: jobsRes.data?.reduce((sum, j) => sum + (j.views_count || 0), 0) || 0
    })
  }

  const formatBudget = (min?: number, max?: number) => {
    if (!min && !max) return 'Budget not specified'
    if (min && max) return `₦${min.toLocaleString()} - ₦${max.toLocaleString()}`
    if (min) return `From ₦${min.toLocaleString()}`
    if (max) return `Up to ₦${max.toLocaleString()}`
  }

  const nigerianStates = [
    'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
    'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Abuja', 'Gombe', 'Imo',
    'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
    'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba',
    'Yobe', 'Zamfara'
  ]

  const jobCategories = [
    'Web Development', 'Mobile Development', 'Design', 'Writing', 'Marketing',
    'Data Analysis', 'Virtual Assistant', 'Customer Service', 'Other'
  ]

  const bottomNavItems = [
    { icon: Home, label: 'Feed', path: '/feed' },
    { icon: MessageCircle, label: 'Chat', path: '/chat' },
    { icon: Users, label: 'Expert', path: '/experts' },
    { icon: Briefcase, label: 'Gig', path: '/jobs' },
    { icon: DollarSign, label: 'Earn', path: '/earn' }
  ]

  const handleNavigation = (path: string) => {
    navigate(path)
  }

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesState = !stateFilter || stateFilter === 'all' || job.location?.includes(stateFilter)
    const matchesCategory = !categoryFilter || categoryFilter === 'all' || 
                           job.required_skills?.some(skill => skill.toLowerCase().includes(categoryFilter.toLowerCase()))
    
    return matchesSearch && matchesState && matchesCategory
  })

  const JobCard = ({ job, showActions = false }: { job: any, showActions?: boolean }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-1">{job.title}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {job.poster_name && (
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={job.poster_picture || undefined} />
                    <AvatarFallback className="text-xs">{job.poster_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs">{job.poster_name}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BookmarkButton type="job" itemId={job.id} />
            {!showActions && user?.id !== job.poster_id && (
              <Button size="sm" onClick={() => navigate(`/chat/${job.poster_id}`)}>
                Chat Now
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{job.description}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="secondary" className="gap-1">
            <DollarSign className="h-3 w-3" />
            {formatBudget(job.budget_min, job.budget_max)}
          </Badge>
          {job.location && (
            <Badge variant="outline" className="gap-1">
              <MapPin className="h-3 w-3" />
              {job.location}
            </Badge>
          )}
          {job.job_type && (
            <Badge variant="outline" className="capitalize">{job.job_type}</Badge>
          )}
          <span className="text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(job.created_at).toLocaleDateString()}
          </span>
        </div>
        {job.required_skills?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {job.required_skills.slice(0, 4).map((skill: string) => (
              <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
            ))}
            {job.required_skills.length > 4 && (
              <Badge variant="secondary" className="text-xs">+{job.required_skills.length - 4}</Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-bold flex-1">Jobs & Gigs</h1>
          <JobPostingDialog
            trigger={
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                Post
              </Button>
            }
          />
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Stats Preview */}
        <div className="grid grid-cols-3 gap-3 p-4">
          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardContent className="pt-3 pb-3 text-center">
              <div className="text-xl font-bold text-blue-600">{stats.posted}</div>
              <div className="text-xs text-muted-foreground">Jobs Posted</div>
            </CardContent>
          </Card>
          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="pt-3 pb-3 text-center">
              <div className="text-xl font-bold text-green-600">{stats.applications}</div>
              <div className="text-xs text-muted-foreground">Applications</div>
            </CardContent>
          </Card>
          <Card className="bg-purple-500/10 border-purple-500/20">
            <CardContent className="pt-3 pb-3 text-center">
              <div className="text-xl font-bold text-purple-600">{stats.views}</div>
              <div className="text-xs text-muted-foreground">Total Views</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="my-jobs">My Jobs</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="mt-4 space-y-4">
            {/* Search and Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <BrandInput
                  placeholder="Search jobs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Select value={stateFilter} onValueChange={setStateFilter}>
                  <SelectTrigger className="flex-1 h-9">
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {nigerianStates.map((state) => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="flex-1 h-9">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {jobCategories.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Job Listings */}
            {filteredJobs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No Jobs Found</h3>
                  <p className="text-sm text-muted-foreground">Be the first to post a job!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3 pb-4">
                {filteredJobs.map((job: PersonalizedJob) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-jobs" className="mt-4 space-y-4">
            {myJobs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No Jobs Posted Yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">Post your first job to find talent</p>
                  <JobPostingDialog
                    trigger={
                      <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        Post a Job
                      </Button>
                    }
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3 pb-4">
                {myJobs.map((job) => (
                  <Card key={job.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold">{job.title}</h3>
                          <p className="text-xs text-muted-foreground">Posted {new Date(job.created_at).toLocaleDateString()}</p>
                        </div>
                        <Badge variant={job.status === 'open' ? 'default' : 'secondary'}>
                          {job.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{job.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {job.views_count || 0} views
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {job.applications_count || 0} applications
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="applications" className="mt-4 space-y-4">
            {myApplications.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No Applications Yet</h3>
                  <p className="text-sm text-muted-foreground">Browse jobs and apply to get started</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3 pb-4">
                {myApplications.map((app) => (
                  <Card key={app.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold">{app.job_posts?.title || 'Job'}</h3>
                          <p className="text-xs text-muted-foreground">Applied {new Date(app.created_at).toLocaleDateString()}</p>
                        </div>
                        <Badge variant={app.status === 'pending' ? 'secondary' : app.status === 'accepted' ? 'default' : 'destructive'}>
                          {app.status}
                        </Badge>
                      </div>
                      {app.cover_letter && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{app.cover_letter}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border z-50">
        <div className="flex justify-around items-center px-1 sm:px-4 py-1.5 sm:py-2 max-w-md mx-auto">
          {bottomNavItems.map((item) => (
            <button
              key={item.label}
              onClick={() => handleNavigation(item.path)}
              className={`flex flex-col items-center gap-0.5 sm:gap-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl transition-colors ${
                location.pathname === item.path
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
              }`}
            >
              <item.icon className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-[10px] sm:text-xs font-medium">{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => setMoreMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 sm:gap-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl transition-colors text-muted-foreground hover:text-primary hover:bg-primary/5"
          >
            <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="text-[10px] sm:text-xs font-medium">More</span>
          </button>
        </div>
      </nav>
      <MoreMenuDrawer open={moreMenuOpen} onOpenChange={setMoreMenuOpen} />
    </div>
  )
}

export default Jobs