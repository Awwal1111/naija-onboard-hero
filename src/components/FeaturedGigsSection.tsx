import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BrandButton } from '@/components/ui/brand-button'
import { Briefcase, Star, ArrowRight, Loader2 } from 'lucide-react'

interface Gig {
  id: string
  title: string
  description: string
  price: number
  category: string
  photo_urls: string[] | null
  user_id: string
  seller_name?: string
  seller_avatar?: string
}

export const FeaturedGigsSection = () => {
  const [gigs, setGigs] = useState<Gig[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFeaturedGigs()
  }, [])

  const fetchFeaturedGigs = async () => {
    try {
      // Fetch recent open gigs
      const { data: gigsData, error } = await supabase
        .from('jobs_services')
        .select('id, title, description, price, category, photo_urls, user_id')
        .in('status', ['open', 'active'])
        .order('created_at', { ascending: false })
        .limit(6)

      if (error) throw error

      if (gigsData && gigsData.length > 0) {
        // Fetch seller profiles
        const userIds = gigsData.map(g => g.user_id)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, profile_picture_url')
          .in('user_id', userIds)

        const gigsWithSellers = gigsData.map(gig => {
          const profile = profiles?.find(p => p.user_id === gig.user_id)
          return {
            ...gig,
            seller_name: profile?.full_name || 'Seller',
            seller_avatar: profile?.profile_picture_url
          }
        })

        setGigs(gigsWithSellers)
      }
    } catch (error) {
      console.error('Error fetching featured gigs:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </section>
    )
  }

  // Don't show section if no gigs
  if (gigs.length === 0) {
    return null
  }

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <Badge variant="secondary" className="mb-2">
                <Briefcase className="w-3 h-3 mr-1" />
                Featured Services
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold">Popular Gigs</h2>
              <p className="text-muted-foreground mt-2">Discover top services from verified professionals</p>
            </div>
            <BrandButton variant="outline" asChild className="hidden sm:flex">
              <Link to="/p/gigs">
                View All
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </BrandButton>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {gigs.map((gig) => (
              <Link key={gig.id} to={`/p/gig/${gig.id}`}>
                <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-1 overflow-hidden group">
                  {/* Gig Image */}
                  <div className="aspect-video bg-muted relative overflow-hidden">
                    {gig.photo_urls && gig.photo_urls.length > 0 ? (
                      <img 
                        src={gig.photo_urls[0]} 
                        alt={gig.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                        <Briefcase className="w-12 h-12 text-primary/30" />
                      </div>
                    )}
                    <Badge className="absolute top-3 left-3 bg-background/90 text-foreground">
                      {gig.category || 'Service'}
                    </Badge>
                  </div>

                  <CardContent className="p-4">
                    {/* Seller Info */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 overflow-hidden">
                        {gig.seller_avatar ? (
                          <img src={gig.seller_avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-medium text-primary">
                            {gig.seller_name?.charAt(0) || 'S'}
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground truncate">{gig.seller_name}</span>
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                      {gig.title}
                    </h3>

                    {/* Rating placeholder */}
                    <div className="flex items-center gap-1 mb-3">
                      <Star className="w-4 h-4 fill-primary text-primary" />
                      <span className="text-sm font-medium">New</span>
                    </div>

                    {/* Price */}
                    <div className="flex items-center justify-between pt-3 border-t">
                      <span className="text-xs text-muted-foreground">Starting at</span>
                      <span className="font-bold text-primary">
                        {gig.price?.toLocaleString()} NC
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Mobile View All Button */}
          <div className="mt-8 text-center sm:hidden">
            <BrandButton variant="outline" asChild>
              <Link to="/p/gigs">
                View All Gigs
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </BrandButton>
          </div>
        </div>
      </div>
    </section>
  )
}
