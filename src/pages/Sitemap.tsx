import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export default function Sitemap() {
  const { data: urls } = useQuery({
    queryKey: ['sitemap'],
    queryFn: async () => {
      const allUrls: Array<{ loc: string; lastmod: string; priority: string }> = [];

      // Static pages
      allUrls.push(
        { loc: '/', lastmod: new Date().toISOString(), priority: '1.0' },
        { loc: '/experts', lastmod: new Date().toISOString(), priority: '0.9' },
        { loc: '/jobs', lastmod: new Date().toISOString(), priority: '0.9' },
        { loc: '/courses', lastmod: new Date().toISOString(), priority: '0.9' },
        { loc: '/fundraising', lastmod: new Date().toISOString(), priority: '0.8' }
      );

      // Public experts
      const { data: experts } = await supabase
        .from('profiles')
        .select('user_id, updated_at')
        .eq('is_expert', true);

      experts?.forEach(expert => {
        allUrls.push({
          loc: `/expert/${expert.user_id}`,
          lastmod: expert.updated_at || new Date().toISOString(),
          priority: '0.8'
        });
      });

      // Public gigs
      const { data: gigs } = await supabase
        .from('jobs_services')
        .select('id, updated_at')
        .eq('status', 'active');

      gigs?.forEach(gig => {
        allUrls.push({
          loc: `/gig/${gig.id}`,
          lastmod: gig.updated_at || new Date().toISOString(),
          priority: '0.7'
        });
      });

      // Jobs
      const { data: jobs } = await supabase
        .from('job_posts')
        .select('id, updated_at')
        .eq('status', 'active');

      jobs?.forEach(job => {
        allUrls.push({
          loc: `/job/${job.id}`,
          lastmod: job.updated_at || new Date().toISOString(),
          priority: '0.7'
        });
      });

      // Courses
      const { data: courses } = await supabase
        .from('courses')
        .select('id, updated_at')
        .eq('status', 'active');

      courses?.forEach(course => {
        allUrls.push({
          loc: `/course/${course.id}`,
          lastmod: course.updated_at || new Date().toISOString(),
          priority: '0.7'
        });
      });

      // Campaigns
      const { data: campaigns } = await supabase
        .from('fundraisings')
        .select('id, updated_at')
        .eq('status', 'approved' as any);

      campaigns?.forEach(campaign => {
        allUrls.push({
          loc: `/campaign/${campaign.id}`,
          lastmod: campaign.updated_at || new Date().toISOString(),
          priority: '0.6'
        });
      });

      return allUrls;
    },
  });

  useEffect(() => {
    if (urls) {
      const baseUrl = window.location.origin;
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${baseUrl}${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

      const blob = new Blob([xml], { type: 'application/xml' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'sitemap.xml';
      link.click();
    }
  }, [urls]);

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Sitemap</h1>
      <p className="text-muted-foreground mb-4">Generating sitemap.xml...</p>
      {urls && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Total URLs: {urls.length}</p>
          <div className="max-h-96 overflow-y-auto border rounded-lg p-4">
            {urls.map((url, index) => (
              <div key={index} className="text-sm py-1">
                {url.loc}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
