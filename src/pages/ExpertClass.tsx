import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Video, Calendar, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/useAuth'
import { useExpertClasses } from '@/hooks/useExpertClasses'
import { CreateClassDialog } from '@/components/CreateClassDialog'
import { ClassCard } from '@/components/ClassCard'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/integrations/supabase/client'

const ExpertClass = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [userProfile, setUserProfile] = useState<any>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const { liveClasses, upcomingClasses, featuredClasses, isLoading } = useExpertClasses()

  // Fetch user profile
  useEffect(() => {
    if (!user) return
    
    supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => setUserProfile(data))
  }, [user])

  const isExpert = userProfile?.user_type === 'expert'

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">ExpertClass</h1>
              <p className="text-primary-foreground/90">Live video training & classes</p>
            </div>
            {isExpert && (
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="bg-background text-foreground hover:bg-background/90"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Class
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue="live" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="live" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Live Now
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="featured" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Featured
            </TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="space-y-4">
            {isLoading ? (
              <>
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-48 w-full rounded-lg" />
              </>
            ) : liveClasses.length === 0 ? (
              <div className="text-center py-12">
                <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Live Classes</h3>
                <p className="text-muted-foreground">Check back later for live sessions</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {liveClasses.map((classItem) => (
                  <ClassCard key={classItem.id} classItem={classItem} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-4">
            {isLoading ? (
              <>
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-48 w-full rounded-lg" />
              </>
            ) : upcomingClasses.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Upcoming Classes</h3>
                <p className="text-muted-foreground">New classes will appear here</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {upcomingClasses.map((classItem) => (
                  <ClassCard key={classItem.id} classItem={classItem} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="featured" className="space-y-4">
            {isLoading ? (
              <>
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-48 w-full rounded-lg" />
              </>
            ) : featuredClasses.length === 0 ? (
              <div className="text-center py-12">
                <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Featured Classes</h3>
                <p className="text-muted-foreground">Featured classes will appear here</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {featuredClasses.map((classItem) => (
                  <ClassCard key={classItem.id} classItem={classItem} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Class Dialog */}
      <CreateClassDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  )
}

export default ExpertClass
