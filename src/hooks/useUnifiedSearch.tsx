import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SearchResult {
  id: string;
  type: 'user' | 'job' | 'post' | 'hashtag' | 'business' | 'location' | 'course' | 'campaign' | 'product' | 'emergency' | 'class' | 'gig' | 'expert';
  title: string;
  subtitle: string;
  description: string;
  image?: string;
  url: string;
  metadata?: any;
}

export const useUnifiedSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: results, isLoading } = useQuery({
    queryKey: ['unified-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];

      const searchTerm = searchQuery.trim();
      const allResults: SearchResult[] = [];

      // 1. Search Users (profiles)
      const { data: users } = await supabase
        .from('profiles')
        .select('user_id, full_name, profession, bio, profile_picture_url')
        .or(`full_name.ilike.%${searchTerm}%,profession.ilike.%${searchTerm}%`)
        .limit(5);

      if (users) {
        users.forEach(user => {
          allResults.push({
            id: user.user_id,
            type: 'user',
            title: user.full_name || 'User',
            subtitle: user.profession || 'NaijaLancers Member',
            description: user.bio || '',
            image: user.profile_picture_url || undefined,
            url: `/profile/${user.user_id}`,
          });
        });
      }

      // 2. Search Jobs (job_posts)
      const { data: jobs } = await supabase
        .from('job_posts')
        .select('id, title, description, location, budget_min, budget_max, company_name')
        .eq('status', 'active')
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%`)
        .limit(5);

      if (jobs) {
        jobs.forEach(job => {
          allResults.push({
            id: job.id,
            type: 'job',
            title: job.title,
            subtitle: job.company_name || job.location || 'Job Opening',
            description: job.description,
            url: `/job/${job.id}`,
            metadata: { budget_min: job.budget_min, budget_max: job.budget_max }
          });
        });
      }

      // 3. Search Gigs (jobs_services)
      const { data: gigs } = await supabase
        .from('jobs_services')
        .select('id, title, description, category, price, photo_urls')
        .eq('status', 'active')
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
        .limit(5);

      if (gigs) {
        gigs.forEach(gig => {
          allResults.push({
            id: gig.id,
            type: 'gig',
            title: gig.title,
            subtitle: gig.category,
            description: gig.description,
            image: gig.photo_urls?.[0],
            url: `/gig/${gig.id}`,
            metadata: { price: gig.price }
          });
        });
      }

      // 4. Search Posts (including hashtag search)
      const { data: posts } = await supabase
        .from('posts')
        .select('id, content, title, user_id, created_at, profiles:user_id(full_name, profile_picture_url)')
        .eq('status', 'active')
        .or(`content.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%`)
        .limit(5);

      if (posts) {
        posts.forEach((post: any) => {
          allResults.push({
            id: post.id,
            type: 'post',
            title: post.title || post.content?.substring(0, 60) + '...' || 'Post',
            subtitle: `by ${post.profiles?.full_name || 'User'}`,
            description: post.content?.substring(0, 100) || '',
            image: post.profiles?.profile_picture_url,
            url: `/feed#post-${post.id}`,
          });
        });
      }

      // 5. Hashtag search - search posts containing hashtags
      if (searchTerm.startsWith('#') || !searchTerm.includes(' ')) {
        const hashtagTerm = searchTerm.startsWith('#') ? searchTerm : `#${searchTerm}`;
        const { data: hashtagPosts } = await supabase
          .from('posts')
          .select('id, content')
          .eq('status', 'active')
          .ilike('content', `%${hashtagTerm}%`)
          .limit(3);

        if (hashtagPosts && hashtagPosts.length > 0) {
          allResults.push({
            id: `hashtag-${searchTerm}`,
            type: 'hashtag',
            title: hashtagTerm,
            subtitle: `${hashtagPosts.length}+ posts`,
            description: `View all posts with ${hashtagTerm}`,
            url: `/search?hashtag=${encodeURIComponent(hashtagTerm)}`,
          });
        }
      }

      // 6. Search by Location (profiles with state_name, lga_name, area)
      const { data: locationProfiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, state_name, lga_name, area, profile_picture_url')
        .or(`state_name.ilike.%${searchTerm}%,lga_name.ilike.%${searchTerm}%,area.ilike.%${searchTerm}%`)
        .limit(5);

      if (locationProfiles && locationProfiles.length > 0) {
        // Add unique location results
        const uniqueStates = [...new Set(locationProfiles.map(p => p.state_name).filter(Boolean))];
        uniqueStates.slice(0, 2).forEach(state => {
          allResults.push({
            id: `location-${state}`,
            type: 'location',
            title: state || 'Location',
            subtitle: `${locationProfiles.filter(p => p.state_name === state).length} professionals`,
            description: `Find professionals in ${state}`,
            url: `/search?location=${encodeURIComponent(state || '')}`,
          });
        });
      }

      // 7. Search Courses
      const { data: courses } = await supabase
        .from('courses')
        .select('id, title, description, instructor_name, price, thumbnail_url, average_rating')
        .eq('status', 'active')
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,instructor_name.ilike.%${searchTerm}%`)
        .limit(5);

      if (courses) {
        courses.forEach(course => {
          allResults.push({
            id: course.id,
            type: 'course',
            title: course.title,
            subtitle: `by ${course.instructor_name || 'Instructor'}`,
            description: course.description,
            image: course.thumbnail_url,
            url: `/course/${course.id}`,
            metadata: { price: course.price, rating: course.average_rating }
          });
        });
      }

      // 8. Search Fundraising/Campaigns
      const { data: campaigns } = await supabase
        .from('fundraisings')
        .select('id, title, description, goal_amount, raised_amount, featured_image_url, category')
        .eq('status', 'approved' as any)
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .limit(5);

      if (campaigns) {
        campaigns.forEach(campaign => {
          allResults.push({
            id: campaign.id,
            type: 'campaign',
            title: campaign.title,
            subtitle: `₦${campaign.raised_amount?.toLocaleString()} raised of ₦${campaign.goal_amount?.toLocaleString()}`,
            description: campaign.description,
            image: campaign.featured_image_url,
            url: `/fundraising/${campaign.id}`,
            metadata: { goal: campaign.goal_amount, raised: campaign.raised_amount }
          });
        });
      }

      // 9. Search Digital Products
      const { data: products } = await supabase
        .from('digital_products')
        .select('id, title, description, category, price, preview_url, average_rating')
        .eq('status', 'active')
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .limit(5);

      if (products) {
        products.forEach(product => {
          allResults.push({
            id: product.id,
            type: 'product',
            title: product.title,
            subtitle: `${product.category} • ₦${product.price?.toLocaleString()}`,
            description: product.description,
            image: product.preview_url,
            url: `/product/${product.id}`,
            metadata: { price: product.price, rating: product.average_rating }
          });
        });
      }

      // 10. Search Emergency Requests
      const { data: emergencies } = await supabase
        .from('emergency_requests')
        .select('id, reason, amount_requested, status, user_id')
        .eq('status', 'pending')
        .ilike('reason', `%${searchTerm}%`)
        .limit(3);

      if (emergencies) {
        emergencies.forEach(emergency => {
          allResults.push({
            id: emergency.id,
            type: 'emergency',
            title: 'Emergency Help Request',
            subtitle: `₦${emergency.amount_requested?.toLocaleString()} needed`,
            description: emergency.reason?.substring(0, 100) || '',
            url: `/emergency/${emergency.id}`,
          });
        });
      }

      // 11. Search Expert Classes
      const { data: classes } = await supabase
        .from('expert_classes')
        .select('id, title, description, category, status, scheduled_start, expert_id, thumbnail_url')
        .in('status', ['scheduled', 'live'])
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
        .limit(5);

      if (classes) {
        classes.forEach(cls => {
          allResults.push({
            id: cls.id,
            type: 'class',
            title: cls.title,
            subtitle: `${cls.category || 'Expert Class'} • ${cls.status}`,
            description: cls.description || '',
            image: cls.thumbnail_url,
            url: `/expert-class/${cls.id}`,
            metadata: { scheduled_start: cls.scheduled_start, status: cls.status }
          });
        });
      }

      // 12. Search Experts (verified professionals)
      const { data: experts } = await supabase
        .from('profiles')
        .select('user_id, full_name, profession, bio, profile_picture_url, average_rating')
        .eq('is_expert', true)
        .or(`full_name.ilike.%${searchTerm}%,profession.ilike.%${searchTerm}%,bio.ilike.%${searchTerm}%`)
        .limit(5);

      if (experts) {
        experts.forEach(expert => {
          allResults.push({
            id: expert.user_id,
            type: 'expert',
            title: expert.full_name || 'Expert',
            subtitle: expert.profession || 'Professional',
            description: expert.bio || '',
            image: expert.profile_picture_url || undefined,
            url: `/expert/${expert.user_id}`,
            metadata: { rating: expert.average_rating }
          });
        });
      }

      return allResults;
    },
    enabled: searchQuery.length >= 2
  });

  return {
    searchQuery,
    setSearchQuery,
    results: results || [],
    isLoading
  };
};
