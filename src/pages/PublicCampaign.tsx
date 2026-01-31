import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Heart } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function PublicCampaign() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();

  const { data: campaign, isLoading } = useQuery({
    queryKey: ['public-campaign', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fundraisings')
        .select('*')
        .eq('id', campaignId)
        .eq('status', 'approved' as any)
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

  if (!campaign) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4 text-center">
        <Helmet>
          <meta name="robots" content="noindex" />
        </Helmet>
        <h1 className="text-2xl font-bold mb-4">Campaign Not Found</h1>
        <p className="text-muted-foreground mb-6">This campaign is not available.</p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  const progress = campaign.goal_amount ? (campaign.raised_amount || 0) / campaign.goal_amount * 100 : 0;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "DonateAction",
    "name": campaign.title,
    "description": campaign.description,
    "recipient": {
      "@type": "Person",
      "name": campaign.beneficiary_name || "Campaign Organizer"
    }
  };

  const canonicalUrl = `https://naijalancers.name.ng/p/campaign/${campaignId}`;

  return (
    <>
      <Helmet>
        <title>{campaign.title} - Fundraising Campaign | NaijaLancers</title>
        <meta name="description" content={campaign.description || `Support ${campaign.title} on NaijaLancers`} />
        <link rel="canonical" href={canonicalUrl} />
        
        <meta property="og:title" content={campaign.title} />
        <meta property="og:description" content={campaign.description || campaign.title} />
        {campaign.featured_image_url && <meta property="og:image" content={campaign.featured_image_url} />}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content="NaijaLancers" />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={campaign.title} />
        <meta name="twitter:description" content={campaign.description || campaign.title} />
        {campaign.featured_image_url && <meta name="twitter:image" content={campaign.featured_image_url} />}
        
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
          {campaign.featured_image_url && (
            <img
              src={campaign.featured_image_url}
              alt={campaign.title}
              className="w-full h-64 object-cover rounded-lg mb-6"
            />
          )}

          <div className="flex items-start gap-4 mb-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Heart className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{campaign.title}</h1>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-2xl font-bold text-primary">
                ₦{(campaign.raised_amount || 0).toLocaleString()}
              </span>
              <span className="text-muted-foreground">
                of ₦{campaign.goal_amount?.toLocaleString()} goal
              </span>
            </div>
            <Progress value={progress} className="h-3" />
            <p className="text-sm text-muted-foreground mt-2">
              {campaign.backer_count || 0} backers
            </p>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Story</h2>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {campaign.detailed_story || campaign.description}
            </p>
          </div>

          <Button size="lg" onClick={() => navigate('/login')}>
            Contribute Now
          </Button>
        </Card>
      </div>
    </>
  );
}
