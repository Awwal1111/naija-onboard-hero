import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';

export default function Sitemap() {
  const baseUrl = 'https://naijalancers.name.ng';

  const { data: urls, isLoading } = useQuery({
    queryKey: ['sitemap'],
    queryFn: async () => {
      const allUrls: Array<{ loc: string; lastmod: string; priority: string }> = [];

      // Static public pages (no auth required)
      allUrls.push(
        { loc: '/', lastmod: new Date().toISOString().split('T')[0], priority: '1.0' },
        { loc: '/welcome', lastmod: new Date().toISOString().split('T')[0], priority: '0.9' },
        { loc: '/faq', lastmod: new Date().toISOString().split('T')[0], priority: '0.7' },
        { loc: '/fundraising', lastmod: new Date().toISOString().split('T')[0], priority: '0.8' },
        { loc: '/terms-conditions', lastmod: new Date().toISOString().split('T')[0], priority: '0.5' },
        { loc: '/policy-privacy', lastmod: new Date().toISOString().split('T')[0], priority: '0.5' }
      );

      // Public expert profiles (using /p/ prefix for SEO - no redirects)
      const { data: experts } = await supabase
        .from('profiles')
        .select('user_id, updated_at, full_name')
        .eq('is_expert', true)
        .limit(500);

      (experts || []).forEach(expert => {
        allUrls.push({
          loc: `/p/expert/${expert.user_id}`,
          lastmod: expert.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          priority: '0.8'
        });
      });

      // Public gigs
      const { data: gigs } = await supabase
        .from('jobs_services')
        .select('id, updated_at')
        .eq('status', 'active')
        .limit(500);

      gigs?.forEach(gig => {
        allUrls.push({
          loc: `/p/gig/${gig.id}`,
          lastmod: gig.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          priority: '0.7'
        });
      });

      // Public jobs
      const { data: jobs } = await supabase
        .from('job_posts')
        .select('id, updated_at')
        .eq('status', 'active')
        .limit(500);

      jobs?.forEach(job => {
        allUrls.push({
          loc: `/p/job/${job.id}`,
          lastmod: job.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          priority: '0.7'
        });
      });

      // Public courses
      const { data: courses } = await supabase
        .from('courses')
        .select('id, updated_at')
        .eq('status', 'active')
        .limit(500);

      courses?.forEach(course => {
        allUrls.push({
          loc: `/p/course/${course.id}`,
          lastmod: course.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          priority: '0.7'
        });
      });

      // Public campaigns
      const { data: campaigns } = await supabase
        .from('fundraisings')
        .select('id, updated_at')
        .eq('status', 'approved' as any)
        .limit(500);

      campaigns?.forEach(campaign => {
        allUrls.push({
          loc: `/p/campaign/${campaign.id}`,
          lastmod: campaign.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          priority: '0.6'
        });
      });

      return allUrls;
    },
  });

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-center text-muted-foreground">Generating sitemap...</p>
      </div>
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${(urls || []).map(url => `  <url>
    <loc>${baseUrl}${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return (
    <>
      <Helmet>
        <title>Sitemap | NaijaLancers</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-4">Dynamic Sitemap</h1>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted rounded-lg text-center">
              <div className="text-2xl font-bold text-primary">{urls?.length || 0}</div>
              <div className="text-xs text-muted-foreground">Total URLs</div>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{urls?.filter(u => u.loc.includes('/p/expert/')).length || 0}</div>
              <div className="text-xs text-muted-foreground">Experts</div>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{urls?.filter(u => u.loc.includes('/p/gig/')).length || 0}</div>
              <div className="text-xs text-muted-foreground">Gigs</div>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600">{urls?.filter(u => u.loc.includes('/p/job/')).length || 0}</div>
              <div className="text-xs text-muted-foreground">Jobs</div>
            </div>
          </div>
          
          <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
            <p className="text-sm mb-2 font-medium">📍 Public URLs for Google:</p>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Static sitemap: <a href="/sitemap.xml" className="text-primary hover:underline">{baseUrl}/sitemap.xml</a></li>
              <li>• Experts: <code className="bg-muted px-1 rounded">/p/expert/[userId]</code></li>
              <li>• Gigs: <code className="bg-muted px-1 rounded">/p/gig/[gigId]</code></li>
              <li>• Jobs: <code className="bg-muted px-1 rounded">/p/job/[jobId]</code></li>
            </ul>
          </div>

          <div className="max-h-96 overflow-y-auto border rounded-lg p-4 bg-muted/30">
            <pre className="text-xs whitespace-pre-wrap">{xml}</pre>
          </div>
        </div>
      </div>
    </>
  );
}
