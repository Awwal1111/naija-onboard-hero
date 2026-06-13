import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MapPin, Briefcase, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function PublicUser() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['public-user', username],
    enabled: !!username,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username, full_name, profession, bio, profile_picture_url, area, country_code, is_expert')
        .ilike('username', username!)
        .limit(1)
        .maybeSingle();
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

  if (!user) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4 text-center">
        <Helmet>
          <title>User not found | NaijaLancers</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <h1 className="text-2xl font-bold mb-4">User Not Found</h1>
        <p className="text-muted-foreground mb-6">No NaijaLancers member matches @{username}.</p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  // If the user is an expert, prefer the richer expert page for SEO
  if (user.is_expert) {
    return <Navigate to={`/p/expert/${user.user_id}`} replace />;
  }

  const canonicalUrl = `https://naijalancers.name.ng/u/${user.username}`;
  const displayName = user.full_name || `@${user.username}`;
  const title = user.profession
    ? `${displayName} — ${user.profession} on NaijaLancers`
    : `${displayName} on NaijaLancers`;
  const description = user.bio
    ? user.bio.slice(0, 155)
    : `${displayName} is a member of NaijaLancers, Africa's freelancing platform powered by Celo.`;
  const image = user.profile_picture_url || 'https://naijalancers.name.ng/logo.png';
  const location = [user.area, user.country_code].filter(Boolean).join(', ');

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: displayName,
    alternateName: user.username,
    jobTitle: user.profession || undefined,
    description: user.bio || undefined,
    image,
    url: canonicalUrl,
  };

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={image} />
        <meta property="og:type" content="profile" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content="NaijaLancers" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={image} />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        <Card className="p-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user.profile_picture_url || ''} alt={displayName} />
              <AvatarFallback className="text-2xl">{displayName[0]}</AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
                {displayName}
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </h1>
              <p className="text-sm text-muted-foreground mb-3">@{user.username}</p>

              <div className="flex flex-wrap items-center gap-4 mb-4 text-muted-foreground">
                {user.profession && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" /> <span>{user.profession}</span>
                  </div>
                )}
                {location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> <span>{location}</span>
                  </div>
                )}
              </div>

              {user.bio && <p className="text-muted-foreground mb-4">{user.bio}</p>}

              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="secondary">NaijaLancers Member</Badge>
                {user.country_code && <Badge variant="outline">{user.country_code}</Badge>}
              </div>

              <div className="flex gap-3 mt-4">
                <Button onClick={() => navigate('/signup')} size="lg">
                  Connect on NaijaLancers
                </Button>
                <Button onClick={() => navigate('/p/experts')} variant="outline" size="lg">
                  Browse Experts
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
