import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin, Briefcase, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function PublicExpert() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const { data: expert, isLoading } = useQuery({
    queryKey: ['public-expert', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, profession, bio, profile_picture_url, average_rating, state_name, area, lga_name')
        .eq('user_id', userId)
        .eq('is_expert', true)
        .single();

      if (error) throw error;
      return data as any;
    },
  });

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Skeleton className="h-8 w-32 mb-6" />
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!expert) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4 text-center">
        <Helmet>
          <meta name="robots" content="noindex" />
        </Helmet>
        <h1 className="text-2xl font-bold mb-4">Expert Not Found</h1>
        <p className="text-muted-foreground mb-6">This expert profile is not available.</p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": expert.full_name,
    "jobTitle": expert.profession,
    "description": expert.bio,
    "image": expert.profile_picture_url,
    "aggregateRating": expert.average_rating ? {
      "@type": "AggregateRating",
      "ratingValue": expert.average_rating,
      "bestRating": "5"
    } : undefined
  };

  const location = [expert.area, expert.lga_name, expert.state_name].filter(Boolean).join(', ');

  const canonicalUrl = `https://naijalancers.name.ng/p/expert/${userId}`;

  return (
    <>
      <Helmet>
        <title>{expert.full_name} - {expert.profession} | NaijaLancers Expert</title>
        <meta name="description" content={expert.bio || `Hire ${expert.full_name}, a professional ${expert.profession} on NaijaLancers. View their skills, ratings, and portfolio.`} />
        <link rel="canonical" href={canonicalUrl} />
        
        {/* OpenGraph tags */}
        <meta property="og:title" content={`${expert.full_name} - ${expert.profession} | NaijaLancers`} />
        <meta property="og:description" content={expert.bio || `Professional ${expert.profession} available for hire`} />
        <meta property="og:image" content={expert.profile_picture_url || 'https://naijalancers.name.ng/logo.png'} />
        <meta property="og:type" content="profile" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content="NaijaLancers" />
        
        {/* Twitter Card tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${expert.full_name} - ${expert.profession}`} />
        <meta name="twitter:description" content={expert.bio || `Professional ${expert.profession}`} />
        <meta name="twitter:image" content={expert.profile_picture_url || 'https://naijalancers.name.ng/logo.png'} />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card className="p-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={expert.profile_picture_url || ''} alt={expert.full_name || 'Expert'} />
              <AvatarFallback className="text-2xl">
                {expert.full_name?.[0] || 'E'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{expert.full_name}</h1>
              
              <div className="flex flex-wrap items-center gap-4 mb-4 text-muted-foreground">
                {expert.profession && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    <span>{expert.profession}</span>
                  </div>
                )}
                
                {location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{location}</span>
                  </div>
                )}
                
                {expert.average_rating && (
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{expert.average_rating.toFixed(1)}</span>
                  </div>
                )}
              </div>

              {expert.bio && (
                <p className="text-muted-foreground mb-4">{expert.bio}</p>
              )}

              {expert.skills && expert.skills.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {expert.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <Button onClick={() => navigate(`/profile/${userId}`)} size="lg">
                  View Full Profile
                </Button>
                <Button onClick={() => navigate('/signup')} variant="outline" size="lg">
                  Join NaijaLancers
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
