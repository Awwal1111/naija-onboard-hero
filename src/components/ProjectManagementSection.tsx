import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BrandButton } from '@/components/ui/brand-button'
import { FolderKanban, Clock, Users, CheckSquare, ArrowRight, CalendarDays, FileText, Timer } from 'lucide-react'

export function ProjectManagementSection() {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <Badge variant="secondary" className="mb-4">
              <FolderKanban className="w-3.5 h-3.5 mr-1.5" />
              Project Management
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Manage Projects Like a Pro</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful tools to collaborate, track time, and deliver projects successfully
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* WorkRooms Card */}
            <Card className="relative overflow-hidden hover:shadow-lg transition-all group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full" />
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <FolderKanban className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">WorkRooms</CardTitle>
                <CardDescription>Team collaboration spaces</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <span>Invite team members with roles</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      <CheckSquare className="w-4 h-4 text-primary" />
                    </div>
                    <span>Task boards with Kanban view</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <span>Share files & activity logs</span>
                  </li>
                </ul>
                <BrandButton asChild variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Link to="/signup">
                    Create WorkRoom
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </BrandButton>
              </CardContent>
            </Card>

            {/* Work Diary Card */}
            <Card className="relative overflow-hidden hover:shadow-lg transition-all group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-accent/20 to-transparent rounded-bl-full" />
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center mb-4">
                  <CalendarDays className="w-6 h-6 text-accent-foreground" />
                </div>
                <CardTitle className="text-xl">Work Diary</CardTitle>
                <CardDescription>Time tracking & billing</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      <Timer className="w-4 h-4 text-primary" />
                    </div>
                    <span>Track hours with one click</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      <Clock className="w-4 h-4 text-primary" />
                    </div>
                    <span>Automatic hourly rate billing</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      <CheckSquare className="w-4 h-4 text-primary" />
                    </div>
                    <span>Client approval workflow</span>
                  </li>
                </ul>
                <BrandButton asChild variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Link to="/signup">
                    Start Tracking
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </BrandButton>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}
