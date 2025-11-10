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

function cleanText(text: string): string {
  if (!text) return '';
  // Remove CDATA
  text = text.replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1');
  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, '');
  // Decode HTML entities
  text = text.replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');
  return text.trim();
}

function extractTextBetween(text: string, start: string, end: string): string {
  const startIndex = text.indexOf(start);
  if (startIndex === -1) return '';
  const contentStart = startIndex + start.length;
  const endIndex = text.indexOf(end, contentStart);
  if (endIndex === -1) return text.substring(contentStart).trim();
  return text.substring(contentStart, endIndex).trim();
}

function parseRSSFeed(xmlText: string, source: string): JobFeed[] {
  const jobs: JobFeed[] = [];
  
  try {
    // Split by <item> tags
    const items = xmlText.split(/<item[^>]*>/i).slice(1);
    
    for (let itemText of items) {
      // Get content before closing </item>
      const itemEnd = itemText.indexOf('</item>');
      if (itemEnd > 0) {
        itemText = itemText.substring(0, itemEnd);
      }
      
      let title = extractTextBetween(itemText, '<title>', '</title>');
      let link = extractTextBetween(itemText, '<link>', '</link>');
      let pubDate = extractTextBetween(itemText, '<pubDate>', '</pubDate>');
      let description = extractTextBetween(itemText, '<description>', '</description>');
      
      // Try alternative date formats
      if (!pubDate) {
        pubDate = extractTextBetween(itemText, '<dc:date>', '</dc:date>');
      }
      if (!pubDate) {
        pubDate = extractTextBetween(itemText, '<published>', '</published>');
      }
      
      title = cleanText(title);
      link = cleanText(link);
      description = cleanText(description);
      
      if (!title || !link) continue;
      
      // Extract company and location
      let company = 'Not specified';
      let location = 'Nigeria';
      
      // Try to extract from title
      if (title.includes(' at ')) {
        const parts = title.split(' at ');
        if (parts.length >= 2) {
          company = parts[parts.length - 1];
          title = parts.slice(0, -1).join(' at ');
        }
      } else if (title.includes(' - ')) {
        const parts = title.split(' - ');
        if (parts.length >= 2) {
          company = parts[parts.length - 1];
          title = parts.slice(0, -1).join(' - ');
        }
      }
      
      // Try to extract location from description
      const locationPatterns = [
        /Location[:\s]+([^<\n,.|]+)/i,
        /\b(Lagos|Abuja|Port Harcourt|Kano|Ibadan|Kaduna|Benin City|Enugu|Ogun|Rivers|Delta|Anambra)\b/i,
      ];
      
      for (const pattern of locationPatterns) {
        const match = description.match(pattern);
        if (match && match[1]) {
          location = match[1].trim();
          break;
        }
      }
      
      jobs.push({
        title: title.substring(0, 200),
        company: company.substring(0, 100),
        location: location.substring(0, 50),
        link: link,
        pubDate: pubDate || new Date().toISOString(),
        description: description.substring(0, 300),
        source,
      });
    }
  } catch (error) {
    console.error(`Error parsing ${source} RSS feed:`, error);
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
      { url: 'https://www.myjobmag.com/feed', name: 'MyJobMag' },
      { url: 'https://www.myjobmag.com/feed?ptype=premium', name: 'MyJobMag Premium' },
    ];
    
    const allJobs: JobFeed[] = [];
    const seenLinks = new Set<string>();
    
    for (const feed of feeds) {
      try {
        console.log(`Fetching ${feed.name} feed from ${feed.url}...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(feed.url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; NaijaLancers/1.0)',
          }
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          console.error(`Failed to fetch ${feed.name}: ${response.status} ${response.statusText}`);
          continue;
        }
        
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('xml') && !contentType.includes('rss')) {
          console.error(`${feed.name} returned non-XML content: ${contentType}`);
          continue;
        }
        
        const xmlText = await response.text();
        console.log(`Received ${xmlText.length} bytes from ${feed.name}`);
        
        const jobs = parseRSSFeed(xmlText, feed.name.replace(' Premium', ''));
        
        // Deduplicate jobs
        const uniqueJobs = jobs.filter(job => {
          if (seenLinks.has(job.link)) {
            return false;
          }
          seenLinks.add(job.link);
          return true;
        });
        
        allJobs.push(...uniqueJobs);
        console.log(`Parsed ${uniqueJobs.length} unique jobs from ${feed.name}`);
      } catch (error) {
        if (error.name === 'AbortError') {
          console.error(`Timeout fetching ${feed.name}`);
        } else {
          console.error(`Error fetching ${feed.name}:`, error.message);
        }
      }
    }
    
    // Sort by publication date (newest first)
    allJobs.sort((a, b) => {
      const dateA = new Date(a.pubDate).getTime();
      const dateB = new Date(b.pubDate).getTime();
      return dateB - dateA;
    });
    
    // Limit to 100 most recent jobs
    const limitedJobs = allJobs.slice(0, 100);
    
    console.log(`Returning ${limitedJobs.length} jobs total`);
    
    return new Response(
      JSON.stringify({ 
        jobs: limitedJobs,
        total: limitedJobs.length,
        sources: [...new Set(limitedJobs.map(j => j.source))],
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=7200', // Cache for 2 hours
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
