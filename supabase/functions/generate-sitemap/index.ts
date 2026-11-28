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

  // Page through every public collection. Supabase/PostgREST may cap a single
  // response below the requested limit, so one large .limit() can silently omit URLs.
  const fetchAllRows = async (queryForPage: (from: number, to: number) => any) => {
    const pageSize = 500;
    const allRows: any[] = [];

    for (let from = 0; ; from += pageSize) {
      const { data, error } = await queryForPage(from, from + pageSize - 1);
      if (error) return { data: null, error };

      const page = data || [];
      allRows.push(...page);
      if (page.length < pageSize) break;
    }

    return { data: allRows, error: null };
  };

  // Stable ordering makes range pagination deterministic across requests.
  const [expertsRes, gigsRes, jobsRes, coursesRes, usersRes] = await Promise.all([
    fetchAllRows((from, to) => supabase.from("profiles")
      .select("user_id, username, full_name, profession, bio, profile_picture_url, updated_at")
      .eq("is_expert", true)
      .not("full_name", "is", null).neq("full_name", "")
      .not("profession", "is", null).neq("profession", "")
      .order("user_id").range(from, to)),
    fetchAllRows((from, to) => supabase.from("jobs_services").select("id, updated_at")
      .eq("status", "active").order("id").range(from, to)),
    // PublicJob and get_public_job only expose jobs with status='open'. Keep the
    // sitemap aligned with that public visibility rule so we don't publish dead URLs.
    fetchAllRows((from, to) => supabase.from("job_posts").select("id, updated_at")
      .eq("status", "open").order("id").range(from, to)),
    fetchAllRows((from, to) => supabase.from("courses").select("id, updated_at")
      .eq("status", "active").order("id").range(from, to)),
    // Only include member profiles with enough public professional information
    // to be useful as search landing pages. The same quality rule is applied
    // on the profile page via its robots meta tag.
    fetchAllRows((from, to) => supabase.from("profiles")
      .select("username, full_name, profession, bio, profile_picture_url, updated_at")
      .not("username", "is", null).not("username", "ilike", "user-%")
      .not("full_name", "is", null).neq("full_name", "")
      .eq("is_expert", false)
      .order("username").range(from, to)),
  ]);

  // Never publish a partial sitemap as a successful response. Google may otherwise
  // treat transient database failures as permanent URL removals.
  const queryErrors = [expertsRes.error, gigsRes.error, jobsRes.error, coursesRes.error, usersRes.error].filter(Boolean);
  if (queryErrors.length > 0) {
    console.error("Sitemap generation failed:", queryErrors);
    return new Response("Sitemap generation temporarily unavailable", {
      status: 503,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  const urls: string[] = [];

  // Static pages
  const staticPages = [
    { loc: "/", priority: "1.0", freq: "daily" },
    { loc: "/welcome", priority: "0.9", freq: "weekly" },
    { loc: "/blog", priority: "0.9", freq: "daily" },
    { loc: "/p/experts", priority: "0.9", freq: "daily" },
    { loc: "/p/gigs", priority: "0.9", freq: "daily" },
    { loc: "/p/jobs", priority: "0.9", freq: "daily" },
    { loc: "/developers", priority: "0.7", freq: "weekly" },
    { loc: "/faq", priority: "0.7", freq: "monthly" },
    { loc: "/help", priority: "0.7", freq: "monthly" },
    { loc: "/install", priority: "0.6", freq: "monthly" },
    { loc: "/terms-conditions", priority: "0.4", freq: "monthly" },
    { loc: "/privacy-policy", priority: "0.4", freq: "monthly" },
    { loc: "/refund-policy", priority: "0.4", freq: "monthly" },
  ];

  // Blog posts (hardcoded slugs — keep in sync with src/content/blogPosts.tsx)
  const blogSlugs = [
    'complete-guide-secure-payments-naijalancers','how-escrow-protects-freelancers-and-clients','how-to-hire-trusted-freelancers-in-nigeria','how-to-withdraw-earnings-naijalancers','how-to-create-gig-that-sells-naijalancers','avoid-freelance-scams-nigeria','naijalancers-vs-fiverr-upwork-nigeria','freelance-tax-nigeria-guide','most-important-skills-ai-era-2026','10-places-to-share-naijalancers-gig','how-to-price-freelance-services-nigeria','best-freelance-niches-nigeria-2026','client-onboarding-freelance-nigeria','how-to-build-portfolio-from-zero-nigeria','naijalancers-vs-self-employed-tax','how-to-handle-difficult-freelance-clients','best-tools-freelancers-nigeria-2026','going-full-time-freelance-nigeria','building-a-personal-brand-as-a-nigerian-freelancer','remote-work-mindset-shift-nigeria','pricing-psychology-for-freelancers','protecting-your-mental-health-as-a-freelancer','ai-collaboration-skills-freelancer-edge','best-freelance-skills-to-learn-in-nigeria-2026','how-to-make-money-online-in-nigeria-legitimately','how-to-receive-international-payments-in-nigeria','how-to-write-a-freelance-proposal-that-wins','top-freelance-platforms-in-nigeria-compared','how-to-sign-up-on-naijalancers','how-to-get-your-first-client-on-naijalancers','what-is-the-nc-wallet-and-how-it-works','how-the-naijalancers-ai-hire-assistant-works','how-to-earn-in-usdt-from-nigeria-2026','best-ai-side-hustles-nigeria-2026','remote-jobs-from-home-nigeria-2026','start-freelancing-no-experience-nigeria','earn-dollars-from-nigeria-naira-hedge','how-to-earn-first-100k-freelancing-nigeria','cold-pitch-templates-nigerian-freelancers','social-media-manager-nigeria-how-to-start','virtual-assistant-jobs-nigeria-guide','content-writing-jobs-nigeria-rates-2026','video-editing-freelance-nigeria-2026','graphic-design-freelance-beginners-nigeria','ai-tools-every-nigerian-freelancer-needs-2026','how-to-rank-your-gig-on-naijalancers-search','nysc-corper-freelance-side-hustle-guide','mobile-only-freelancing-nigeria-no-laptop','teach-on-naijalancers-create-paid-courses','sell-digital-products-nigeria-passive-income','freelance-contract-template-nigeria','niche-down-freelance-services-higher-rates','best-freelancing-platform-in-nigeria','myths-about-freelancing-nigeria','why-cryptocurrency-considered-scam-naijalancers-celo','complete-guide-to-freelancing-from-zero','valora-minipay-naijalancers-celo-guide','why-traditional-banks-not-needed-international-freelancing-2026','common-mistakes-loss-of-funds-crypto','limitations-cryptocurrency-payment-method','case-study-hiring-freelancers-naijalancers','why-freelancers-fail-to-get-clients-with-right-skills','freelancing-sites-in-nigeria','freelancing-platform-that-pays-in-crypto','why-naijalancers-is-best-freelancing-platform-nigeria','naijalancers-hidden-complexity-crypto-deposits-withdrawals','freelancing-vs-remote-jobs-difference','how-businesses-hire-experts-on-naijalancers','future-of-freelancing-in-africa','best-side-hustles-students-nigeria','spot-fake-freelancer-credentials-scam','nigerian-english-confidence-sound-professional','best-crypto-freelance-platform-celo-nigeria-2026','why-naijalancers-profiles-show-google-search','deposit-naira-mpesa-cedis-rand-naijalancers','how-to-get-first-client-naijalancers','celo-vs-ethereum-freelance-payments','spot-avoid-freelance-scams-nigeria-2026','top-paying-freelance-niches-nigeria-2026','freelancing-for-beginners-nigeria-2026','stablecoins-explained-cusd-usdt-naira','pricing-your-freelance-services-nigeria','crypto-wallet-security-101-nigeria','minipay-guide-for-nigerian-freelancers','building-portfolio-no-experience-nigeria','tax-and-legal-freelancers-nigeria-2026','getting-paid-internationally-from-nigeria-2026','common-crypto-mistakes-new-users-nigeria','using-ai-tools-as-freelancer-2026',
  ];
  for (const slug of blogSlugs) {
    staticPages.push({ loc: `/blog/${slug}`, priority: "0.7", freq: "weekly" });
  }


  for (const page of staticPages) {
    urls.push(`  <url>
    <loc>${baseUrl}${page.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.freq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`);
  }

  // Expert profiles: include only profiles with enough public professional detail
  // to be useful in search. PublicExpert applies the same noindex quality rule.
  for (const expert of expertsRes.data || []) {
    const hasUsefulBio = (expert.bio?.trim().length || 0) >= 60;
    const hasProfileImage = Boolean(expert.profile_picture_url?.trim());
    if (!expert.profession?.trim() || (!hasUsefulBio && !hasProfileImage)) continue;
    const lastmod = expert.updated_at?.split("T")[0] || today;
    urls.push(`  <url>
    <loc>${baseUrl}/p/expert/${encodeURIComponent(expert.username || expert.user_id)}</loc>
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

  // Public member profiles (/u/:username) — non-expert members
  for (const u of usersRes.data || []) {
    if (!u.username || !u.full_name?.trim()) continue;
    const hasProfession = Boolean(u.profession?.trim());
    const hasUsefulBio = (u.bio?.trim().length || 0) >= 60;
    const hasProfileImage = Boolean(u.profile_picture_url?.trim());
    // A name plus a professional description is the minimum useful member page.
    if (!hasProfession || (!hasUsefulBio && !hasProfileImage)) continue;
    const lastmod = u.updated_at?.split("T")[0] || today;
    urls.push(`  <url>
    <loc>${baseUrl}/u/${encodeURIComponent(u.username)}</loc>
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
