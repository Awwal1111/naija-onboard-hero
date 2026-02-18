import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const baseUrl = "https://naijalancers.name.ng";
  const today = new Date().toISOString().split("T")[0];

  // Fetch all public content in parallel
  const [expertsRes, gigsRes, jobsRes, coursesRes, campaignsRes] = await Promise.all([
    supabase.from("profiles").select("user_id, updated_at").eq("is_expert", true).limit(2000),
    supabase.from("jobs_services").select("id, updated_at").eq("status", "active").limit(2000),
    supabase.from("job_posts").select("id, updated_at").eq("status", "active").limit(2000),
    supabase.from("courses").select("id, updated_at").eq("status", "active").limit(2000),
    supabase.from("fundraisings").select("id, updated_at").limit(2000),
  ]);

  const urls: string[] = [];

  // Static pages
  const staticPages = [
    { loc: "/", priority: "1.0", freq: "daily" },
    { loc: "/welcome", priority: "0.9", freq: "weekly" },
    { loc: "/p/experts", priority: "0.9", freq: "daily" },
    { loc: "/p/gigs", priority: "0.9", freq: "daily" },
    { loc: "/p/jobs", priority: "0.9", freq: "daily" },
    { loc: "/signup", priority: "0.8", freq: "monthly" },
    { loc: "/login", priority: "0.6", freq: "monthly" },
    { loc: "/fundraising", priority: "0.8", freq: "daily" },
    { loc: "/developers", priority: "0.7", freq: "weekly" },
    { loc: "/faq", priority: "0.7", freq: "monthly" },
    { loc: "/help", priority: "0.7", freq: "monthly" },
    { loc: "/install", priority: "0.6", freq: "monthly" },
    { loc: "/terms-conditions", priority: "0.4", freq: "monthly" },
    { loc: "/privacy-policy", priority: "0.4", freq: "monthly" },
    { loc: "/refund-policy", priority: "0.4", freq: "monthly" },
  ];

  for (const page of staticPages) {
    urls.push(`  <url>
    <loc>${baseUrl}${page.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.freq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`);
  }

  // Expert profiles
  for (const expert of expertsRes.data || []) {
    const lastmod = expert.updated_at?.split("T")[0] || today;
    urls.push(`  <url>
    <loc>${baseUrl}/p/expert/${expert.user_id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
  }

  // Gigs
  for (const gig of gigsRes.data || []) {
    const lastmod = gig.updated_at?.split("T")[0] || today;
    urls.push(`  <url>
    <loc>${baseUrl}/p/gig/${gig.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
  }

  // Jobs
  for (const job of jobsRes.data || []) {
    const lastmod = job.updated_at?.split("T")[0] || today;
    urls.push(`  <url>
    <loc>${baseUrl}/p/job/${job.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`);
  }

  // Courses
  for (const course of coursesRes.data || []) {
    const lastmod = course.updated_at?.split("T")[0] || today;
    urls.push(`  <url>
    <loc>${baseUrl}/p/course/${course.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
  }

  // Campaigns
  for (const campaign of campaignsRes.data || []) {
    const lastmod = campaign.updated_at?.split("T")[0] || today;
    urls.push(`  <url>
    <loc>${baseUrl}/p/campaign/${campaign.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
});
