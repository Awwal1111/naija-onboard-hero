import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Video, Calendar, Star, User, Search, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { useExpertClasses } from '@/hooks/useExpertClasses'
import { CreateClassDialog } from '@/components/CreateClassDialog'
import { ClassCard } from '@/components/ClassCard'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/integrations/supabase/client'
import { ExpertClassHelpDialog } from '@/components/ExpertClassHelpDialog'

const ExpertClass = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [userProfile, setUserProfile] = useState<any>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('discover')
  const { myClasses, liveClasses, upcomingClasses, featuredClasses, pastClasses, isLoading } = useExpertClasses()

  useEffect(() => {
    if (!user) return
    
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      if (!error) setUserProfile(data)
    }
    
    fetchProfile()
  }, [user])

  const isExpert = Boolean(userProfile?.is_expert === true)

  // Filter classes by search
  const filterClasses = (classes: any[]) => {
    if (!searchQuery.trim()) return classes
    const query = searchQuery.toLowerCase()
    return classes.filter(c => 
      c.title?.toLowerCase().includes(query) ||
      c.description?.toLowerCase().includes(query) ||
      c.category?.toLowerCase().includes(query) ||
      c.expert?.full_name?.toLowerCase().includes(query)
    )
  }

  const ClassGrid = ({ classes, emptyIcon: Icon, emptyTitle, emptyMessage }: {
    classes: any[],
    emptyIcon: React.ElementType,
    emptyTitle: string,
    emptyMessage: string
  }) => {
    if (isLoading) {
      return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-72 w-full rounded-xl" />
          ))}
        </div>
      )
    }

    if (classes.length === 0) {
      return (
        <div className="text-center py-16 bg-muted/30 rounded-xl">
          <Icon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">{emptyTitle}</h3>
          <p className="text-muted-foreground text-sm">{emptyMessage}</p>
        </div>
      )
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {classes.map((classItem) => (
          <ClassCard key={classItem.id} classItem={classItem} />
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">ExpertClass</h1>
              <p className="text-primary-foreground/80 text-sm">Live video training & classes</p>
            </div>
            <div className="flex items-center gap-2">
              <ExpertClassHelpDialog 
                trigger={
                  <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
                    <HelpCircle className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Help</span>
                  </Button>
                }
              />
              {isExpert && (
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  size="sm"
                  className="bg-background text-foreground hover:bg-background/90"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create
                </Button>
              )}
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search classes, topics, or experts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background/95 border-0 text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full mb-6 ${isExpert ? 'grid-cols-4' : 'grid-cols-3'}`}>
            {isExpert && (
              <TabsTrigger value="my-classes" className="flex items-center gap-1.5 text-xs">
                <User className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">My Classes</span>
                <span className="sm:hidden">Mine</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="discover" className="flex items-center gap-1.5 text-xs">
              <Video className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Live & Upcoming</span>
              <span className="sm:hidden">Live</span>
            </TabsTrigger>
            <TabsTrigger value="featured" className="flex items-center gap-1.5 text-xs">
              <Star className="h-3.5 w-3.5" />
              Featured
            </TabsTrigger>
            <TabsTrigger value="past" className="flex items-center gap-1.5 text-xs">
              <Calendar className="h-3.5 w-3.5" />
              Past
            </TabsTrigger>
          </TabsList>

          {/* My Classes Tab (Experts Only) */}
          {isExpert && (
            <TabsContent value="my-classes" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Your Classes</h2>
                <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  New Class
                </Button>
              </div>
              <ClassGrid
                classes={filterClasses(myClasses)}
                emptyIcon={Video}
                emptyTitle="No Classes Yet"
                emptyMessage="Create your first class to start teaching"
              />
            </TabsContent>
          )}

          {/* Discover Tab */}
          <TabsContent value="discover" className="space-y-6">
            {/* Live Now Section */}
            {filterClasses(liveClasses).length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  Live Now
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filterClasses(liveClasses).map((classItem) => (
                    <ClassCard key={classItem.id} classItem={classItem} />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Section */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Upcoming Classes</h2>
              <ClassGrid
                classes={filterClasses(upcomingClasses)}
                emptyIcon={Calendar}
                emptyTitle="No Upcoming Classes"
                emptyMessage="Check back later for scheduled classes"
              />
            </div>
          </TabsContent>

          {/* Featured Tab */}
          <TabsContent value="featured" className="space-y-4">
            <ClassGrid
              classes={filterClasses(featuredClasses)}
              emptyIcon={Star}
              emptyTitle="No Featured Classes"
              emptyMessage="Top-rated classes will appear here"
            />
          </TabsContent>

          {/* Past Tab */}
          <TabsContent value="past" className="space-y-4">
            <ClassGrid
              classes={filterClasses(pastClasses)}
              emptyIcon={Calendar}
              emptyTitle="No Past Classes"
              emptyMessage="Completed classes with recordings will appear here"
            />
          </TabsContent>
        </Tabs>
      </div>

      <CreateClassDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  )
}

export default ExpertClass
