import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Star, Clock, CheckCircle2, Share2, Heart, MessageCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { BookmarkButton } from '@/components/BookmarkButton';
import { toast } from 'sonner';

export default function PublicGig() {
  const { gigId } = useParams<{ gigId: string }>();
  const navigate = useNavigate();

  const { data: gig, isLoading } = useQuery({
    queryKey: ['public-gig', gigId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs_services')
        .select('*, profiles:user_id(full_name, profile_picture_url, is_expert, average_rating)')
        .eq('id', gigId)
        .eq('status', 'active')
        .single();

      if (error) throw error;
      return data;
    },
  });

  const handleShare = async () => {
    try {
      await navigator.share({
        title: gig?.title,
        text: gig?.description,
        url: window.location.href,
      });
    } catch {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="max-w-4xl mx-auto p-4 space-y-4">
          <Skeleton className="w-full aspect-video rounded-lg" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Helmet>
          <meta name="robots" content="noindex" />
        </Helmet>
        <Card className="p-8 text-center max-w-sm">
          <h1 className="text-xl font-bold mb-2">Gig Not Found</h1>
          <p className="text-muted-foreground text-sm mb-4">This service is no longer available.</p>
          <Button onClick={() => navigate('/jobs')}>Browse Services</Button>
        </Card>
      </div>
    );
  }

  const seller = gig.profiles as any;
  const rating = seller?.average_rating || 5.0;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": gig.title,
    "description": gig.description,
    "category": gig.category,
    "offers": {
      "@type": "Offer",
      "price": gig.price,
      "priceCurrency": "NGN"
    }
  };

  return (
    <>
      <Helmet>
        <title>{gig.title} - ₦{gig.price?.toLocaleString()} | NaijaLancers</title>
        <meta name="description" content={gig.description || `${gig.title} service on NaijaLancers`} />
        <meta property="og:title" content={gig.title} />
        <meta property="og:description" content={gig.description || gig.title} />
        {gig.photo_urls?.[0] && <meta property="og:image" content={gig.photo_urls[0]} />}
        <meta property="og:type" content="product" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={gig.title} />
        <meta name="twitter:description" content={gig.description || gig.title} />
        {gig.photo_urls?.[0] && <meta name="twitter:image" content={gig.photo_urls[0]} />}
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
          <div className="flex items-center justify-between px-4 py-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <BookmarkButton type="gig" itemId={gig.id} />
              <Button variant="ghost" size="icon" onClick={handleShare}>
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Gallery */}
          {gig.photo_urls?.length > 0 ? (
            <div className="aspect-video bg-muted">
              <img
                src={gig.photo_urls[0]}
                alt={gig.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <span className="text-6xl">🎨</span>
            </div>
          )}

          <div className="p-4 space-y-5">
            {/* Seller Info */}
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11 ring-2 ring-border">
                <AvatarImage src={seller?.profile_picture_url} alt={seller?.full_name} />
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {seller?.full_name?.charAt(0)?.toUpperCase() || 'S'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-sm">{seller?.full_name || 'Seller'}</span>
                  {seller?.is_expert && (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-0.5">
                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium text-foreground">{rating.toFixed(1)}</span>
                  </div>
                  <span>•</span>
                  <Badge variant="secondary" className="text-[10px] h-5">{gig.category}</Badge>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1.5 h-8"
                onClick={() => navigate(`/profile/${gig.user_id}`)}
              >
                View Profile
              </Button>
            </div>

            {/* Title & Price */}
            <div>
              <h1 className="text-xl font-bold leading-tight mb-3">{gig.title}</h1>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-primary">₦{gig.price?.toLocaleString()}</span>
              </div>
            </div>

            {/* Description */}
            <Card className="p-4">
              <h2 className="font-semibold mb-2 text-sm">About This Service</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {gig.description}
              </p>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3 text-center">
                <Clock className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <div className="text-xs text-muted-foreground">Delivery</div>
                <div className="font-semibold text-sm">Fast</div>
              </Card>
              <Card className="p-3 text-center">
                <Star className="h-5 w-5 mx-auto text-yellow-400 fill-yellow-400 mb-1" />
                <div className="text-xs text-muted-foreground">Rating</div>
                <div className="font-semibold text-sm">{rating.toFixed(1)}</div>
              </Card>
              <Card className="p-3 text-center">
                <CheckCircle2 className="h-5 w-5 mx-auto text-primary mb-1" />
                <div className="text-xs text-muted-foreground">Status</div>
                <div className="font-semibold text-sm">Active</div>
              </Card>
            </div>
          </div>
        </div>

        {/* Fixed Bottom CTA */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">Starting at</div>
              <div className="text-xl font-bold text-primary">₦{gig.price?.toLocaleString()}</div>
            </div>
            <Button 
              size="lg" 
              className="gap-2 px-8"
              onClick={() => navigate('/login')}
            >
              <MessageCircle className="h-4 w-4" />
              Contact Seller
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
