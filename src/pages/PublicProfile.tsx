import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Briefcase, MapPin, ArrowLeft, Star, UserPlus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const { data: rows, isLoading } = useQuery({
    queryKey: ['public-profile-by-id', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_profile_by_id' as any, { _user_id: userId });
      if (error) throw error;
      return data as any[];
    },
  });

  const profile = Array.isArray(rows) ? rows[0] : null;

  if (profile?.username) {
    return <Navigate to={profile.is_expert ? `/p/expert/${profile.username}` : `/u/${profile.username}`} replace />;
  }

  if (isLoading) return <div className="container max-w-3xl mx-auto p-6"><Skeleton className="h-64 w-full rounded-xl" /></div>;

  if (!profile) return (
    <div className="container max-w-3xl mx-auto p-8 text-center">
      <Helmet><title>Profile not found | NaijaLancers</title><meta name="robots" content="noindex" /></Helmet>
      <h1 className="text-2xl font-bold mb-3">Profile not available</h1>
      <p className="text-muted-foreground mb-5">This member may have removed their public profile.</p>
      <Button onClick={() => navigate('/experts')}>Browse experts</Button>
    </div>
  );

  const name = profile.full_name || profile.username || 'NaijaLancers member';
  const location = [profile.area, profile.lga_name, profile.state_name].filter(Boolean).join(', ');
  const canonical = 'https://naijalancers.name.ng/profile/' + profile.user_id;
  const description = profile.bio || (profile.profession ? name + ' — ' + profile.profession + ' on NaijaLancers.' : name + ' on NaijaLancers.');

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    alternateName: profile.username || undefined,
    jobTitle: profile.profession || undefined,
    description,
    image: profile.profile_picture_url || undefined,
    url: canonical,
    address: location ? { '@type': 'PostalAddress', addressLocality: location, addressCountry: 'NG' } : undefined,
    knowsAbout: profile.profession ? [profile.profession] : undefined,
  };

  return (
    <>
      <Helmet>
        <title>{name}{profile.profession ? ' — ' + profile.profession : ''} | NaijaLancers</title>
        <meta name="description" content={description.slice(0, 155)} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="profile" />
        <meta property="og:title" content={name + ' | NaijaLancers'} />
        <meta property="og:description" content={description.slice(0, 200)} />
        <meta property="og:image" content={profile.profile_picture_url || 'https://naijalancers.name.ng/logo.png'} />
        <meta property="og:url" content={canonical} />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>
      <main className="min-h-screen bg-background">
        <div className="container max-w-3xl mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-5"><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
          <Card className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.profile_picture_url || ''} alt={name} />
                <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold">{name}</h1>
                {profile.username && <p className="text-sm text-muted-foreground mt-1">@{profile.username}</p>}
                {profile.profession && <p className="text-primary font-medium mt-2 flex items-center gap-2"><Briefcase className="h-4 w-4" />{profile.profession}</p>}
                <div className="flex flex-wrap gap-2 mt-3">
                  {location && <Badge variant="outline"><MapPin className="h-3 w-3 mr-1" />{location}</Badge>}
                  {profile.is_expert && <Badge variant="secondary">Freelancer</Badge>}
                  {profile.expert_verified_at && <Badge variant="outline">Verified expert</Badge>}
                  {Number(profile.rating_count || 0) > 0 && <Badge variant="outline"><Star className="h-3 w-3 mr-1" />{Number(profile.average_rating || 0).toFixed(1)} ({profile.rating_count})</Badge>}
                </div>
              </div>
            </div>
            {(profile.skill_category || profile.years_experience != null) && (
              <div className="flex flex-wrap gap-2 mt-5">
                {profile.skill_category && <Badge variant="secondary">{profile.skill_category}</Badge>}
                {profile.years_experience != null && <Badge variant="outline">{profile.years_experience} years experience</Badge>}
              </div>
            )}
            {profile.bio && <section className="mt-7"><h2 className="font-semibold mb-2">About</h2><p className="text-muted-foreground whitespace-pre-wrap">{profile.bio}</p></section>}
            <div className="flex flex-wrap gap-3 mt-7">
              {profile.is_expert && <Button onClick={() => navigate('/expert/' + profile.user_id)}>View expert profile</Button>}
              <Button variant="outline" onClick={() => navigate('/signup')}><UserPlus className="h-4 w-4 mr-2" />Join NaijaLancers</Button>
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}
