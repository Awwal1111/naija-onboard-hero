# Elasticsearch Integration for NaijaLancers

## Overview
This document outlines the Elasticsearch integration strategy for NaijaLancers to enable advanced search, personalized recommendations, analytics, and AI-enhanced features.

## Architecture Options

### Option 1: Elastic Cloud (Recommended)
Use Elastic Cloud's managed Elasticsearch service:
1. Sign up at https://cloud.elastic.co/
2. Create a deployment
3. Get your Cloud ID and API Key
4. Store them as secrets in Lovable (ELASTICSEARCH_CLOUD_ID, ELASTICSEARCH_API_KEY)

### Option 2: Self-Hosted
Host Elasticsearch on your own infrastructure (requires dedicated server).

## Implementation Strategy

### 1. Data Indexing
We'll index the following data types:
- **Jobs** (job_posts table)
- **Experts** (profiles with is_expert = true)
- **Courses** (courses table)
- **Digital Products** (digital_products table)
- **Fundraising Campaigns** (fundraisings table)
- **Gigs** (jobs_services table)

### 2. Edge Functions Setup
Create Supabase Edge Functions to:
- **Sync data** to Elasticsearch (on create/update/delete)
- **Search queries** via Elasticsearch API
- **Analytics** data collection

### 3. Required Edge Functions

#### `/supabase/functions/elasticsearch-sync/index.ts`
Syncs Supabase data to Elasticsearch indices.

#### `/supabase/functions/elasticsearch-search/index.ts`
Handles search queries across all indices.

#### `/supabase/functions/elasticsearch-recommendations/index.ts`
Generates personalized recommendations using Elasticsearch ML features.

### 4. Frontend Integration
Update existing search hooks:
- `useUnifiedSearch` - integrate Elasticsearch results
- Create `useElasticsearchRecommendations` hook
- Add analytics tracking

## Cost Considerations
- **Elastic Cloud**: ~$95/month for starter plan (14-day free trial)
- **Alternative**: Use Supabase's built-in full-text search (free, less powerful)

## Next Steps

### Immediate (Without Elasticsearch)
1. ✅ Fixed sitemap.xml for Google indexing
2. ✅ Updated robots.txt
3. Enhance Supabase full-text search with pg_trgm and ts_vector

### With Elasticsearch (Requires Setup)
1. Create Elastic Cloud account
2. Add secrets: ELASTICSEARCH_CLOUD_ID, ELASTICSEARCH_API_KEY
3. Create edge functions for sync and search
4. Set up database triggers to sync changes
5. Build search UI with Elasticsearch results

## Current Search Capabilities
NaijaLancers currently uses Supabase's `ILIKE` pattern matching. This works but has limitations:
- No relevance scoring
- Limited fuzzy matching
- No typo tolerance
- Basic filtering

## Elasticsearch Benefits
- **Relevance scoring** - Better results ranking
- **Fuzzy matching** - Handles typos
- **Faceted search** - Advanced filtering
- **Aggregations** - Analytics and insights
- **Machine learning** - Personalized recommendations
- **Speed** - Fast searches even with millions of records

## Testing Plan
1. Set up test index with sample data
2. Compare search results: Supabase vs Elasticsearch
3. Measure performance improvements
4. A/B test with users

## Resources
- [Elasticsearch Official Docs](https://www.elastic.co/guide/index.html)
- [Elasticsearch JavaScript Client](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/index.html)
- [Elastic Cloud](https://cloud.elastic.co/)

---

**Status**: Ready for Elasticsearch Cloud setup. Need credentials to proceed with implementation.
