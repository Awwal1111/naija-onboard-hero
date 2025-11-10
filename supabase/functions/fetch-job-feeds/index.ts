import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JobFeed {
  title: string;
  company: string;
  location: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
}

function parseRSSFeed(xmlText: string, source: string): JobFeed[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
  
  const items = xmlDoc.getElementsByTagName('item');
  const jobs: JobFeed[] = [];
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const title = item.getElementsByTagName('title')[0]?.textContent || '';
    const link = item.getElementsByTagName('link')[0]?.textContent || '';
    const pubDate = item.getElementsByTagName('pubDate')[0]?.textContent || '';
    const description = item.getElementsByTagName('description')[0]?.textContent || '';
    
    // Extract company and location from title or description
    // Jobberman format is usually: "Job Title at Company Name"
    let company = 'Not specified';
    let location = 'Nigeria';
    
    if (title.includes(' at ')) {
      const parts = title.split(' at ');
      company = parts[1] || company;
    }
    
    // Try to extract location from description
    const locationMatch = description.match(/Location[:\s]+([^<\n]+)/i);
    if (locationMatch) {
      location = locationMatch[1].trim();
    }
    
    jobs.push({
      title,
      company,
      location,
      link,
      pubDate,
      description: description.replace(/<[^>]*>/g, '').substring(0, 200),
      source,
    });
  }
  
  return jobs;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching job feeds...');
    
    const feeds = [
      { url: 'https://www.jobberman.com/jobs/rss', name: 'Jobberman' },
      { url: 'https://www.myjobmag.com/feed', name: 'MyJobMag' },
    ];
    
    const allJobs: JobFeed[] = [];
    
    for (const feed of feeds) {
      try {
        console.log(`Fetching ${feed.name} feed...`);
        const response = await fetch(feed.url);
        
        if (!response.ok) {
          console.error(`Failed to fetch ${feed.name}: ${response.status}`);
          continue;
        }
        
        const xmlText = await response.text();
        const jobs = parseRSSFeed(xmlText, feed.name);
        allJobs.push(...jobs);
        console.log(`Parsed ${jobs.length} jobs from ${feed.name}`);
      } catch (error) {
        console.error(`Error fetching ${feed.name}:`, error);
      }
    }
    
    // Sort by publication date (newest first)
    allJobs.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    
    console.log(`Total jobs fetched: ${allJobs.length}`);
    
    return new Response(
      JSON.stringify({ jobs: allJobs }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=14400', // Cache for 4 hours
        } 
      }
    );
  } catch (error) {
    console.error('Error in fetch-job-feeds:', error);
    return new Response(
      JSON.stringify({ error: error.message, jobs: [] }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
