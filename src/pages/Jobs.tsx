import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, MapPin, Clock, DollarSign, Users, Briefcase, Home, MessageCircle, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BrandInput } from '@/components/ui/brand-input'
import { useAuth } from '@/hooks/useAuth'
import { usePersonalizedJobs, PersonalizedJob } from '@/hooks/usePersonalizedDiscovery'
import JobPostingDialog from '@/components/JobPostingDialog'
import TopBannerAd from '@/components/TopBannerAd'
import { MoreMenuDrawer } from '@/components/MoreMenuDrawer'

const Jobs = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { jobs, loading } = usePersonalizedJobs(50)
  const [searchQuery, setSearchQuery] = useState('')
  const [stateFilter, setStateFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          <h1 className="text-2xl font-bold text-text-primary">Gigs</h1>
            <div className="ml-auto">
              <div className="w-32 h-10 bg-background-secondary rounded animate-pulse"></div>
            </div>
          </div>

          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-background-secondary rounded mb-3 w-3/4"></div>
                  <div className="h-4 bg-background-secondary rounded mb-2 w-1/2"></div>
                  <div className="h-4 bg-background-secondary rounded w-full"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 pb-20">
      {/* Top Ad Banner */}
      <TopBannerAd />
      
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-text-primary">Gigs</h1>
          
          <div className="ml-auto">
            <JobPostingDialog
              trigger={
                      <Button className="gap-2">
                        <Briefcase className="h-4 w-4" />
                        Post Gig
                      </Button>
              }
            />
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4 mb-6">
          <div className="relative">
            <BrandInput
              placeholder="Search gigs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-3">
            <div className="flex-1">
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger className="w-full h-10 bg-input">
                  <SelectValue placeholder="Filter by state" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border z-50 max-h-60 overflow-y-auto">
                  <SelectItem value="all">All States</SelectItem>
                  {nigerianStates.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full h-10 bg-input">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border z-50 max-h-60 overflow-y-auto">
                  <SelectItem value="all">All Categories</SelectItem>
                  {jobCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {filteredJobs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Briefcase className="h-12 w-12 text-text-secondary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-text-primary mb-2">No Gigs Available</h3>
              <p className="text-text-secondary mb-4">Be the first to post a gig opportunity!</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-4">
              {filteredJobs.map((job: PersonalizedJob) => (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{job.title}</CardTitle>
                      
                      <div className="flex items-center gap-4 text-sm text-text-secondary mb-3">
                        {job.poster_name && (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={job.poster_picture || undefined} />
                              <AvatarFallback className="text-xs">
                                {job.poster_name?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{job.poster_name}</span>
                            {job.poster_profession && (
                              <span className="text-text-tertiary">• {job.poster_profession}</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          {formatBudget(job.budget_min || undefined, job.budget_max || undefined)}
                        </div>
                        
                        {job.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {job.location}
                          </div>
                        )}
                        
                        {job.job_type && (
                          <Badge variant="secondary" className="capitalize">
                            {job.job_type}
                          </Badge>
                        )}
                        
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(job.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    {user?.id !== job.poster_id && (
                      <Button 
                        size="sm"
                        onClick={() => {
                          navigate(`/chat/${job.poster_id}`)
                        }}
                      >
                        Chat Me Now
                      </Button>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <p className="text-text-primary mb-4 whitespace-pre-wrap break-words overflow-hidden">
                    {job.description.length > 200 ? job.description.substring(0, 200) + '...' : job.description}
                  </p>
                  
                  {job.required_skills && job.required_skills.length > 0 && (
                    <div>
                      <h4 className="font-medium text-text-primary mb-2">Required Skills:</h4>
                      <div className="flex flex-wrap gap-2">
                        {job.required_skills.map((skill) => (
                          <Badge key={skill} variant="outline">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            </div>
          </>
        )}
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
                  : 'text-text-secondary hover:text-primary hover:bg-primary/5'
              }`}
            >
              <item.icon className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-[10px] sm:text-xs font-medium">{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => setMoreMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 sm:gap-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl transition-colors text-text-secondary hover:text-primary hover:bg-primary/5"
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