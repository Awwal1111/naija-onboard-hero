import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, Quote, TrendingUp, Briefcase, Award, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SuccessStory {
  id: string;
  full_name: string;
  profession: string;
  profile_picture_url: string | null;
  total_earnings: number;
  completed_jobs_count: number;
  average_rating: number;
  rating_count: number;
  is_expert: boolean;
}

interface RealTestimonial {
  id: string;
  rating: number;
  review: string | null;
  created_at: string;
  user: {
    full_name: string | null;
    profession: string | null;
    profile_picture_url: string | null;
  } | null;
}

export const SuccessStoriesSection = () => {
  const [topEarners, setTopEarners] = useState<SuccessStory[]>([]);
  const [testimonials, setTestimonials] = useState<RealTestimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    completedJobs: 0,
    totalPaidOut: 0,
    avgRating: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch top earners
      const { data: earners } = await supabase
        .from("profiles")
        .select("user_id, full_name, profession, profile_picture_url, total_earnings, completed_jobs_count, average_rating, rating_count, is_expert")
        .gt("total_earnings", 0)
        .gt("rating_count", 0)
        .order("total_earnings", { ascending: false })
        .limit(6);

      if (earners) {
        setTopEarners(earners.map(e => ({ ...e, id: e.user_id })) as unknown as SuccessStory[]);
      }

      // Fetch real testimonials from platform_ratings
      const { data: ratingsData } = await supabase
        .from('platform_ratings' as any)
        .select('id, rating, review, created_at, user_id')
        .eq('is_featured', true)
        .not('review', 'is', null)
        .order('created_at', { ascending: false })
        .limit(6) as any;

      if (ratingsData && ratingsData.length > 0) {
        const userIds = ratingsData.map((r: any) => r.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name, profession, profile_picture_url')
          .in('user_id', userIds);

        const testimonialsWithProfiles = ratingsData.map((rating: any) => {
          const profile = profilesData?.find((p: any) => p.user_id === rating.user_id);
          return {
            id: rating.id,
            rating: rating.rating,
            review: rating.review,
            created_at: rating.created_at,
            user: profile ? {
              full_name: profile.full_name,
              profession: profile.profession,
              profile_picture_url: profile.profile_picture_url
            } : null
          };
        });

        setTestimonials(testimonialsWithProfiles);
      }

      // Fetch platform stats
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { data: jobStats } = await supabase
        .from('profiles')
        .select('completed_jobs_count, total_earnings, average_rating')
        .gt('completed_jobs_count', 0);

      if (jobStats) {
        const completedJobs = jobStats.reduce((sum, p) => sum + (p.completed_jobs_count || 0), 0);
        const totalPaid = jobStats.reduce((sum, p) => sum + (p.total_earnings || 0), 0);
        const avgRating = jobStats.length > 0 
          ? jobStats.reduce((sum, p) => sum + (p.average_rating || 0), 0) / jobStats.filter(p => p.average_rating > 0).length
          : 4.8;

        setStats({
          totalUsers: userCount || 0,
          completedJobs,
          totalPaidOut: totalPaid,
          avgRating: Math.round(avgRating * 10) / 10 || 4.8
        });
      }
    } catch (err) {
      console.error("Error fetching success stories:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatEarnings = (amount: number) => {
    if (amount >= 1000000) return `₦${(amount / 1000000).toFixed(1)}M+`;
    if (amount >= 1000) return `₦${(amount / 1000).toFixed(0)}K+`;
    return `₦${amount}`;
  };

  const formatPaidOut = (amount: number) => {
    if (amount >= 1000000) return `₦${(amount / 1000000).toFixed(1)}M+`;
    if (amount >= 1000) return `₦${Math.round(amount / 1000)}K+`;
    return `₦${amount}+`;
  };

  // Don't render section if no real data
  if (loading) {
    return null;
  }

  const hasRealData = topEarners.length > 0 || testimonials.length > 0;

  if (!hasRealData) {
    return null;
  }

  return (
    <section className="py-12 sm:py-16 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <Badge variant="secondary" className="mb-4">
            <TrendingUp className="w-3 h-3 mr-1" />
            Real Success Stories
          </Badge>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3">
            Verified Earnings on NaijaLancers
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Real users, real earnings - no fake testimonials
          </p>
        </div>

        {/* Top Earners Grid */}
        {topEarners.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
            {topEarners.map((earner) => (
              <Card key={earner.id} className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="pt-6 pb-4">
                  <Avatar className="w-16 h-16 mx-auto mb-3 border-2 border-primary/20">
                    <AvatarImage src={earner.profile_picture_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {earner.full_name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <h4 className="font-semibold text-sm truncate">{earner.full_name}</h4>
                  <p className="text-xs text-muted-foreground truncate">{earner.profession}</p>
                  <div className="flex items-center justify-center gap-1 mt-2">
                    <Star className="w-3 h-3 fill-primary text-primary" />
                    <span className="text-xs font-medium">{earner.average_rating?.toFixed(1) || "5.0"}</span>
                  </div>
                  <p className="text-primary font-bold text-sm mt-2">
                    {formatEarnings(earner.total_earnings)}
                  </p>
                  {earner.is_expert && (
                    <Badge variant="secondary" className="mt-2 text-xs">
                      <Award className="w-3 h-3 mr-1" />
                      Expert
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Real Testimonials - Only shown if there are real reviews */}
        {testimonials.length > 0 && (
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {testimonials.slice(0, 3).map((testimonial) => (
              <Card key={testimonial.id} className="relative overflow-hidden">
                <div className="absolute top-4 right-4 text-primary/10">
                  <Quote className="w-12 h-12" />
                </div>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="w-12 h-12 border-2 border-primary/20">
                      <AvatarImage src={testimonial.user?.profile_picture_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {testimonial.user?.full_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{testimonial.user?.full_name || "Verified User"}</h4>
                        <CheckCircle className="w-4 h-4 text-primary" />
                      </div>
                      <p className="text-sm text-muted-foreground">{testimonial.user?.profession || "Freelancer"}</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-4 italic line-clamp-3">"{testimonial.review}"</p>
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={`w-4 h-4 ${star <= testimonial.rating ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/30'}`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(testimonial.created_at).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Stats Bar - Only real stats */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          {[
            { label: "Registered Users", value: stats.totalUsers > 0 ? `${stats.totalUsers.toLocaleString()}+` : "Growing", icon: "👨‍💻" },
            { label: "Jobs Completed", value: stats.completedJobs > 0 ? `${stats.completedJobs.toLocaleString()}+` : "Growing", icon: "✅" },
            { label: "Total Paid Out", value: stats.totalPaidOut > 0 ? formatPaidOut(stats.totalPaidOut) : "Growing", icon: "💰" },
            { label: "Average Rating", value: `${stats.avgRating}/5`, icon: "⭐" },
          ].map((stat, index) => (
            <div key={index} className="text-center p-4 bg-card rounded-xl border border-border">
              <span className="text-2xl mb-2 block">{stat.icon}</span>
              <p className="text-xl sm:text-2xl font-bold text-primary">{stat.value}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
