import React, { useState, useEffect } from 'react'
import { Search, Filter, Clock, MapPin, DollarSign, Eye, Home, MessageCircle, Users, User as UserIcon } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { BrandInput } from '@/components/ui/brand-input'
import { BrandButton } from '@/components/ui/brand-button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface Job {
  id: string
  user_id: string
  title: string
  description: string
  price: number
  category: string
  status: string
  created_at: string
  profiles?: {
    full_name: string
    profile_picture_url: string
  } | null
}

const Jobs = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  const bottomNavItems = [
    { icon: Home, label: 'Feed', path: '/feed' },
    { icon: MessageCircle, label: 'Chat', path: '/chat' },
    { icon: Users, label: 'Expert', path: '/experts' },
    { icon: DollarSign, label: 'Earn', path: '/earn', active: true },
    { icon: UserIcon, label: 'Profile', path: '/profile' }
  ]

  const jobCategories = [
    'Web Development',
    'Mobile App Development',
    'UI/UX Design',
    'Graphic Design',
    'Digital Marketing',
    'Content Writing',
    'Data Analysis',
    'Video Editing',
    'Photography',
    'Social Media Management',
    'Virtual Assistant',
    'Accounting & Finance',
    'Translation Services',
    'Voice Over',
    'Music Production',
    'Architecture',
    'Engineering',
    'Legal Services',
    'Business Consulting',
    'Event Planning',
    'Fashion Design',
    'Interior Design',
    'Teaching & Tutoring',
    'Health & Fitness',
    'Beauty & Wellness',
    'Cleaning Services',
    'Delivery Services',
    'Repair & Maintenance',
    'Security Services',
    'Catering & Food',
    'Transportation',
    'Real Estate',
    'Agriculture',
    'Manufacturing',
    'Trading & Sales'
  ]

  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs_services')
        .select(`
          *,
          profiles (
            full_name,
            profile_picture_url
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error
      setJobs((data as any) || [])
    } catch (error) {
      console.error('Error fetching jobs:', error)
      toast({
        title: "Error",
        description: "Failed to load jobs marketplace",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredAndSortedJobs = jobs
    .filter(job => {
      const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           job.category.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = !categoryFilter || job.category === categoryFilter
      
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-high':
          return b.price - a.price
        case 'price-low':
          return a.price - b.price
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

  const formatTimeAgo = (date: string) => {
    const now = new Date()
    const posted = new Date(date)
    const diffInHours = Math.floor((now.getTime() - posted.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours} hours ago`
    const days = Math.floor(diffInHours / 24)
    return `${days} days ago`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-20">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading jobs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-background border-b border-border px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">Jobs Marketplace</h1>
          <div className="text-sm text-text-secondary">{filteredAndSortedJobs.length} jobs</div>
        </div>
      </header>

      <div className="px-6 py-4">
        {/* Search and Filters */}
        <div className="space-y-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-text-secondary" />
            <BrandInput
              placeholder="Search jobs and services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-3">
            <div className="flex-1">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full h-10 bg-input">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border z-50 max-h-60 overflow-y-auto">
                  <SelectItem value="" className="hover:bg-accent">All Categories</SelectItem>
                  {jobCategories.map((category) => (
                    <SelectItem key={category} value={category} className="hover:bg-accent">
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full h-10 bg-input">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border z-50">
                  <SelectItem value="newest" className="hover:bg-accent">Newest First</SelectItem>
                  <SelectItem value="price-high" className="hover:bg-accent">Highest Price</SelectItem>
                  <SelectItem value="price-low" className="hover:bg-accent">Lowest Price</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Jobs Grid */}
        {filteredAndSortedJobs.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="h-16 w-16 text-text-secondary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">No Jobs Found</h3>
            <p className="text-text-secondary">
              {searchQuery || categoryFilter 
                ? 'Try adjusting your search filters'
                : 'No active jobs available yet'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAndSortedJobs.map((job) => (
              <div
                key={job.id}
                className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  {/* Company/Poster Avatar */}
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold shrink-0">
                    {job.profiles?.full_name?.charAt(0) || 'U'}
                  </div>
                  
                  {/* Job Info */}
                  <div className="flex-1 min-w-0">
                    {/* Job Title */}
                    <h3 className="text-lg font-semibold text-text-primary mb-2 line-clamp-2">
                      {job.title}
                    </h3>
                    
                    {/* Company Name */}
                    <p className="text-sm text-text-secondary mb-2">
                      Posted by {job.profiles?.full_name || 'Anonymous'}
                    </p>
                    
                    {/* Category Tag */}
                    <div className="inline-block bg-primary/10 text-primary text-xs px-3 py-1 rounded-full mb-3">
                      {job.category}
                    </div>
                    
                    {/* Description */}
                    <p className="text-sm text-text-secondary mb-4 line-clamp-2">
                      {job.description}
                    </p>
                    
                    {/* Price and Time */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-primary" />
                        <span className="text-lg font-bold text-primary">
                          ₦{job.price.toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1 text-text-secondary text-sm">
                        <Clock className="h-4 w-4" />
                        {formatTimeAgo(job.created_at)}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <BrandButton 
                        size="sm" 
                        className="flex-1"
                        onClick={() => navigate(`/chat/${job.user_id}`)}
                      >
                        Apply Now
                      </BrandButton>
                      <BrandButton variant="outline" size="sm" className="flex-1">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </BrandButton>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-2">
        <div className="flex justify-around items-center">
          {bottomNavItems.map((item) => (
            <Link 
              key={item.label} 
              to={item.path}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-colors ${
                item.active 
                  ? 'text-primary bg-primary/10' 
                  : 'text-text-secondary hover:text-primary hover:bg-primary/5'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Jobs