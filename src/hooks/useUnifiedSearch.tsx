import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SearchResult {
  id: string;
  type: 'expert' | 'gig' | 'job' | 'course' | 'campaign' | 'user' | 'post';
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

      // Search users (all profiles)
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

      // Search posts
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

      // Search experts (profiles with is_expert = true)
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

      // Search gigs (jobs_services)
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

      // Search jobs
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

      // Search courses
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

      // Search campaigns (fundraisings)
      const { data: campaigns } = await supabase
        .from('fundraisings')
        .select('id, title, description, goal_amount, raised_amount, featured_image_url')
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
            url: `/campaign/${campaign.id}`,
            metadata: { goal: campaign.goal_amount, raised: campaign.raised_amount }
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
