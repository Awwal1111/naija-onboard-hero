import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function PublicGig() {
  const { gigId } = useParams<{ gigId: string }>();
  const navigate = useNavigate();

  const { data: gig, isLoading } = useQuery({
    queryKey: ['public-gig', gigId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs_services')
        .select('*')
        .eq('id', gigId)
        .eq('status', 'active')
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Skeleton className="h-8 w-32 mb-6" />
        <Card className="p-6">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-4 w-48 mb-4" />
          <Skeleton className="h-32 w-full" />
        </Card>
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4 text-center">
        <Helmet>
          <meta name="robots" content="noindex" />
        </Helmet>
        <h1 className="text-2xl font-bold mb-4">Gig Not Found</h1>
        <p className="text-muted-foreground mb-6">This gig is not available.</p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

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
        
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card className="p-6">
          {gig.photo_urls?.[0] && (
            <img
              src={gig.photo_urls[0]}
              alt={gig.title}
              className="w-full h-64 object-cover rounded-lg mb-6"
            />
          )}

          <div className="flex items-start gap-4 mb-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{gig.title}</h1>
              <Badge variant="secondary">{gig.category}</Badge>
            </div>
          </div>

          <div className="text-3xl font-bold text-primary mb-6">
            ₦{gig.price?.toLocaleString()}
          </div>

          <p className="text-muted-foreground mb-6 whitespace-pre-wrap">
            {gig.description}
          </p>

          <Button size="lg" onClick={() => navigate('/login')}>
            Contact Seller
          </Button>
        </Card>
      </div>
    </>
  );
}
