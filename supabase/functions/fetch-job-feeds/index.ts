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

function extractTextBetween(text: string, start: string, end: string): string {
  const startIndex = text.indexOf(start);
  if (startIndex === -1) return '';
  const contentStart = startIndex + start.length;
  const endIndex = text.indexOf(end, contentStart);
  if (endIndex === -1) return '';
  return text.substring(contentStart, endIndex).trim();
}

function parseRSSFeed(xmlText: string, source: string): JobFeed[] {
  const jobs: JobFeed[] = [];
  
  // Split by <item> tags to get individual job items
  const itemMatches = xmlText.split('<item>').slice(1); // Skip first element (before first <item>)
  
  for (const itemText of itemMatches) {
    // Extract fields using simple string parsing
    let title = extractTextBetween(itemText, '<title>', '</title>');
    const link = extractTextBetween(itemText, '<link>', '</link>');
    const pubDate = extractTextBetween(itemText, '<pubDate>', '</pubDate>');
    let description = extractTextBetween(itemText, '<description>', '</description>');
    
    // Handle CDATA sections
    title = title.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');
    description = description.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');
    
    // Remove HTML tags from description
    description = description.replace(/<[^>]*>/g, '').trim();
    
    if (!title || !link) continue;
    
    // Extract company and location from title or description
    // Jobberman format is usually: "Job Title at Company Name"
    let company = 'Not specified';
    let location = 'Nigeria';
    
    if (title.includes(' at ')) {
      const parts = title.split(' at ');
      company = parts[1] || company;
      title = parts[0] || title;
    } else if (title.includes(' - ')) {
      const parts = title.split(' - ');
      if (parts.length > 1) {
        company = parts[parts.length - 1] || company;
      }
    }
    
    // Try to extract location from description
    const locationMatch = description.match(/Location[:\s]+([^\n,]+)/i);
    if (locationMatch) {
      location = locationMatch[1].trim();
    }
    
    jobs.push({
      title: title.trim(),
      company: company.trim(),
      location: location.trim(),
      link: link.trim(),
      pubDate: pubDate || new Date().toISOString(),
      description: description.substring(0, 200),
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
