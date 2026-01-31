import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Briefcase, MapPin, DollarSign, Share2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ShareButtons } from '@/components/ShareButtons';

export default function PublicJob() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  const { data: job, isLoading } = useQuery({
    queryKey: ['public-job', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_posts')
        .select('*')
        .eq('id', jobId)
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

  if (!job) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4 text-center">
        <Helmet>
          <meta name="robots" content="noindex" />
        </Helmet>
        <h1 className="text-2xl font-bold mb-4">Job Not Found</h1>
        <p className="text-muted-foreground mb-6">This job posting is not available.</p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "title": job.title,
    "description": job.description,
    "datePosted": job.created_at,
    "hiringOrganization": job.company_name ? {
      "@type": "Organization",
      "name": job.company_name
    } : undefined,
    "jobLocation": job.location ? {
      "@type": "Place",
      "address": job.location
    } : undefined,
    "baseSalary": job.budget_min && job.budget_max ? {
      "@type": "MonetaryAmount",
      "currency": "NGN",
      "value": {
        "@type": "QuantitativeValue",
        "minValue": job.budget_min,
        "maxValue": job.budget_max,
        "unitText": "MONTH"
      }
    } : undefined
  };

  const canonicalUrl = `https://naijalancers.name.ng/p/job/${jobId}`;

  return (
    <>
      <Helmet>
        <title>{job.title} {job.company_name ? `at ${job.company_name}` : ''} | NaijaLancers</title>
        <meta name="description" content={job.description || `${job.title} job opportunity on NaijaLancers`} />
        <link rel="canonical" href={canonicalUrl} />
        
        <meta property="og:title" content={job.title} />
        <meta property="og:description" content={job.description || job.title} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content="NaijaLancers" />
        
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={job.title} />
        <meta name="twitter:description" content={job.description || job.title} />
        
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
          <div className="flex items-start gap-4 mb-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{job.title}</h1>
              {job.company_name && (
                <p className="text-xl text-muted-foreground mb-2">{job.company_name}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mb-6">
            {job.location && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{job.location}</span>
              </div>
            )}
            {(job.budget_min || job.budget_max) && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>
                  ₦{job.budget_min?.toLocaleString()} - ₦{job.budget_max?.toLocaleString()}
                </span>
              </div>
            )}
            {job.job_type && <Badge variant="secondary">{job.job_type}</Badge>}
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Description</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">{job.description}</p>
            </div>

            {job.required_skills && job.required_skills.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-2">Required Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {job.required_skills.map((skill, index) => (
                    <Badge key={index} variant="outline">{skill}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Share Section */}
          <div className="mb-6 p-4 bg-muted/30 rounded-lg">
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Share this job
            </p>
            <ShareButtons
              title={job.title}
              text={`🚀 ${job.title}${job.company_name ? ` at ${job.company_name}` : ''} - Check out this job on NaijaLancers!`}
              url={`/job/${job.id}`}
            />
          </div>

          <Button size="lg" onClick={() => navigate('/login')}>
            Apply Now
          </Button>
        </Card>
      </div>
    </>
  );
}
