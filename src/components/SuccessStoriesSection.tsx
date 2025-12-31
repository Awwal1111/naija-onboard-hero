import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, Quote, TrendingUp, Briefcase, Award } from "lucide-react";
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

// Static testimonials for when we don't have enough real data
const staticTestimonials = [
  {
    name: "Adaeze O.",
    profession: "Graphics Designer",
    quote: "I made my first ₦50,000 within 2 weeks of joining NaijaLancers. The platform connected me with serious clients!",
    earnings: "₦450,000+",
    avatar: null,
  },
  {
    name: "Chukwuemeka N.",
    profession: "Web Developer",
    quote: "Finally, a Nigerian platform that understands our market. SafePay gives me peace of mind on every project.",
    earnings: "₦1.2M+",
    avatar: null,
  },
  {
    name: "Fatima A.",
    profession: "Content Writer",
    quote: "From side hustle to full-time income. NaijaLancers helped me build a career writing for top Nigerian brands.",
    earnings: "₦380,000+",
    avatar: null,
  },
];

export const SuccessStoriesSection = () => {
  const [topEarners, setTopEarners] = useState<SuccessStory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopEarners();
  }, []);

  const fetchTopEarners = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, profession, profile_picture_url, total_earnings, completed_jobs_count, average_rating, rating_count, is_expert")
        .gt("total_earnings", 0)
        .gt("rating_count", 0)
        .order("total_earnings", { ascending: false })
        .limit(6);

      if (!error && data) {
        setTopEarners(data as SuccessStory[]);
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

  return (
    <section className="py-12 sm:py-16 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <Badge variant="secondary" className="mb-4">
            <TrendingUp className="w-3 h-3 mr-1" />
            Real Success Stories
          </Badge>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3">
            Nigerians Earning on NaijaLancers
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Join thousands of freelancers building their careers and earning real money
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
                    <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
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

        {/* Testimonials */}
        <div className="grid md:grid-cols-3 gap-6">
          {staticTestimonials.map((testimonial, index) => (
            <Card key={index} className="relative overflow-hidden">
              <div className="absolute top-4 right-4 text-primary/10">
                <Quote className="w-12 h-12" />
              </div>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="w-12 h-12 border-2 border-primary/20">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {testimonial.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-semibold">{testimonial.name}</h4>
                    <p className="text-sm text-muted-foreground">{testimonial.profession}</p>
                  </div>
                </div>
                <p className="text-muted-foreground mb-4 italic">"{testimonial.quote}"</p>
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                    ))}
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-600/30">
                    <Briefcase className="w-3 h-3 mr-1" />
                    {testimonial.earnings}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats Bar */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          {[
            { label: "Active Freelancers", value: "10,000+", icon: "👨‍💻" },
            { label: "Jobs Completed", value: "25,000+", icon: "✅" },
            { label: "Total Paid Out", value: "₦50M+", icon: "💰" },
            { label: "Average Rating", value: "4.8/5", icon: "⭐" },
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
