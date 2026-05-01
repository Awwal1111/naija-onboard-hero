import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Briefcase, CheckCircle2 } from 'lucide-react'
import { useCollaborations } from '@/hooks/useCollaborations'
import { Skeleton } from '@/components/ui/skeleton'

interface WorkedWithSectionProps {
  userId: string
  isOwnProfile?: boolean
}

const sourceLabel = (source: string): string => {
  const parts = source.split(',')
  if (parts.includes('escrow')) return 'Paid project'
  if (parts.includes('workroom')) return 'WorkRoom'
  if (parts.includes('hourly')) return 'Hourly work'
  if (parts.includes('gig_order')) return 'Gig'
  return 'Chat project'
}

export const WorkedWithSection = ({ userId, isOwnProfile }: WorkedWithSectionProps) => {
  const navigate = useNavigate()
  const { data, isLoading } = useCollaborations(userId)

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Briefcase className="h-5 w-5 text-primary" />
            Worked With
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 overflow-x-auto">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-20 rounded-xl shrink-0" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    if (!isOwnProfile) return null
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Briefcase className="h-5 w-5 text-primary" />
            Worked With
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            People you complete projects with will appear here.
          </p>
        </CardContent>
      </Card>
    )
  }

  const totalProjects = data.reduce((sum, c) => sum + Number(c.project_count || 0), 0)

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Worked With
          </span>
          <Badge variant="secondary" className="font-normal">
            {totalProjects} completed
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {data.slice(0, 12).map((collab) => {
            const name = collab.partner?.full_name || 'User'
            const initial = name.charAt(0).toUpperCase()
            return (
              <button
                key={collab.partner_id}
                onClick={() => navigate(`/profile/${collab.partner_id}`)}
                className="group flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-muted/60 transition-colors text-center"
              >
                <div className="relative">
                  <Avatar className="h-14 w-14 border-2 border-border group-hover:border-primary transition-colors">
                    <AvatarImage src={collab.partner?.profile_picture_url || undefined} />
                    <AvatarFallback>{initial}</AvatarFallback>
                  </Avatar>
                  <CheckCircle2 className="absolute -bottom-1 -right-1 h-5 w-5 text-primary bg-background rounded-full" />
                </div>
                <div className="w-full">
                  <p className="text-xs font-medium text-foreground truncate">{name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {collab.project_count} · {sourceLabel(collab.source)}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
