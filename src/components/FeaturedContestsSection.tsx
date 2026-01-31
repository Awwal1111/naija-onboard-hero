import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BrandButton } from '@/components/ui/brand-button'
import { Trophy, Clock, DollarSign, Users, ArrowRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export function FeaturedContestsSection() {
  const { data: contests, isLoading } = useQuery({
    queryKey: ['featured-contests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contests')
        .select('id, title, description, prize_amount, deadline, category, status')
        .in('status', ['open', 'active'])
        .order('created_at', { ascending: false })
        .limit(4)

      if (error) throw error
      return data || []
    },
  })

  if (isLoading || !contests?.length) return null

  return (
    <section className="py-16 bg-gradient-to-br from-amber-50/50 via-background to-background dark:from-amber-950/20">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <Badge variant="secondary" className="mb-4 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
              <Trophy className="w-3.5 h-3.5 mr-1.5" />
              Design Contests
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Win Big in Contests</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Compete with other creatives, showcase your skills, and win cash prizes
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {contests.map((contest) => (
              <Card key={contest.id} className="group hover:shadow-lg transition-all hover:-translate-y-1 border-amber-200/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-xs capitalize">
                      {contest.category}
                    </Badge>
                    <Badge className="bg-amber-500 text-white">
                      <DollarSign className="w-3 h-3 mr-0.5" />
                      {contest.prize_amount?.toLocaleString()} NC
                    </Badge>
                  </div>
                  <CardTitle className="text-base line-clamp-2 group-hover:text-primary transition-colors">
                    {contest.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {contest.description}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {contest.deadline ? formatDistanceToNow(new Date(contest.deadline), { addSuffix: true }) : 'Open'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <BrandButton asChild size="lg" variant="outline" className="border-amber-500/50 text-amber-700 hover:bg-amber-50 dark:text-amber-400">
              <Link to="/signup" className="flex items-center gap-2">
                View All Contests
                <ArrowRight className="w-4 h-4" />
              </Link>
            </BrandButton>
          </div>
        </div>
      </div>
    </section>
  )
}
