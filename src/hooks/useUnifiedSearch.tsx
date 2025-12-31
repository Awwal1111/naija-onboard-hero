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
  is_premium?: boolean;
}

export const useUnifiedSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: results, isLoading } = useQuery({
    queryKey: ['unified-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];

      const searchTerm = searchQuery.trim();
      const allResults: SearchResult[] = [];

      // 1. Search Users (profiles) - include premium status
      const { data: users } = await supabase
        .from('profiles')
        .select('user_id, full_name, profession, bio, profile_picture_url, is_premium, premium_expires_at')
        .or(`full_name.ilike.%${searchTerm}%,profession.ilike.%${searchTerm}%`)
        .limit(10);

      if (users) {
        users.forEach(user => {
          const isPremiumActive = user.is_premium && user.premium_expires_at && new Date(user.premium_expires_at) > new Date();
          allResults.push({
            id: user.user_id,
            type: 'user',
            title: user.full_name || 'User',
            subtitle: user.profession || 'NaijaLancers Member',
            description: user.bio || '',
            image: user.profile_picture_url || undefined,
            url: `/profile/${user.user_id}`,
            is_premium: isPremiumActive,
          });
        });
      }

      // 2. Search Jobs (job_posts) - include poster's premium status
      const { data: jobs } = await supabase
        .from('job_posts')
        .select('id, title, description, location, budget_min, budget_max, company_name, user_id')
        .eq('status', 'active')
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%`)
        .limit(10);

      if (jobs) {
        // Fetch premium status for job posters
        const userIds = jobs.map(j => j.user_id).filter(Boolean);
        const { data: jobPosters } = await supabase
          .from('profiles')
          .select('user_id, is_premium, premium_expires_at')
          .in('user_id', userIds);

        const premiumMap = new Map(jobPosters?.map(p => [p.user_id, p.is_premium && p.premium_expires_at && new Date(p.premium_expires_at) > new Date()]) || []);

        jobs.forEach(job => {
          allResults.push({
            id: job.id,
            type: 'job',
            title: job.title,
            subtitle: job.company_name || job.location || 'Job Opening',
            description: job.description,
            url: `/job/${job.id}`,
            metadata: { budget_min: job.budget_min, budget_max: job.budget_max },
            is_premium: premiumMap.get(job.user_id) || false,
          });
        });
      }

      // 3. Search Gigs (jobs_services) - include seller's premium status
      const { data: gigs } = await supabase
        .from('jobs_services')
        .select('id, title, description, category, price, photo_urls, user_id')
        .eq('status', 'active')
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
        .limit(10);

      if (gigs) {
        const userIds = gigs.map(g => g.user_id).filter(Boolean);
        const { data: gigSellers } = await supabase
          .from('profiles')
          .select('user_id, is_premium, premium_expires_at')
          .in('user_id', userIds);

        const premiumMap = new Map(gigSellers?.map(p => [p.user_id, p.is_premium && p.premium_expires_at && new Date(p.premium_expires_at) > new Date()]) || []);

        gigs.forEach(gig => {
          allResults.push({
            id: gig.id,
            type: 'gig',
            title: gig.title,
            subtitle: gig.category,
            description: gig.description,
            image: gig.photo_urls?.[0],
            url: `/gig/${gig.id}`,
            metadata: { price: gig.price },
            is_premium: premiumMap.get(gig.user_id) || false,
          });
        });
      }

      // 4. Search Posts - include author's premium status
      const { data: posts } = await supabase
        .from('posts')
        .select('id, content, title, user_id, created_at, profiles:user_id(full_name, profile_picture_url, is_premium, premium_expires_at)')
        .eq('status', 'active')
        .or(`content.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%`)
        .limit(10);

      if (posts) {
        posts.forEach((post: any) => {
          const isPremiumActive = post.profiles?.is_premium && post.profiles?.premium_expires_at && new Date(post.profiles.premium_expires_at) > new Date();
          allResults.push({
            id: post.id,
            type: 'post',
            title: post.title || post.content?.substring(0, 60) + '...' || 'Post',
            subtitle: `by ${post.profiles?.full_name || 'User'}`,
            description: post.content?.substring(0, 100) || '',
            image: post.profiles?.profile_picture_url,
            url: `/feed#post-${post.id}`,
            is_premium: isPremiumActive,
          });
        });
      }

      // 5. Hashtag search
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

      // 6. Search by Location
      const { data: locationProfiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, state_name, lga_name, area, profile_picture_url')
        .or(`state_name.ilike.%${searchTerm}%,lga_name.ilike.%${searchTerm}%,area.ilike.%${searchTerm}%`)
        .limit(5);

      if (locationProfiles && locationProfiles.length > 0) {
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

      // 7. Search Courses - include instructor's premium status
      const { data: courses } = await supabase
        .from('courses')
        .select('id, title, description, instructor_name, price, thumbnail_url, average_rating, user_id')
        .eq('status', 'active')
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,instructor_name.ilike.%${searchTerm}%`)
        .limit(10);

      if (courses) {
        const userIds = courses.map(c => c.user_id).filter(Boolean);
        const { data: instructors } = await supabase
          .from('profiles')
          .select('user_id, is_premium, premium_expires_at')
          .in('user_id', userIds);

        const premiumMap = new Map(instructors?.map(p => [p.user_id, p.is_premium && p.premium_expires_at && new Date(p.premium_expires_at) > new Date()]) || []);

        courses.forEach(course => {
          allResults.push({
            id: course.id,
            type: 'course',
            title: course.title,
            subtitle: `by ${course.instructor_name || 'Instructor'}`,
            description: course.description,
            image: course.thumbnail_url,
            url: `/course/${course.id}`,
            metadata: { price: course.price, rating: course.average_rating },
            is_premium: premiumMap.get(course.user_id) || false,
          });
        });
      }

      // 8. Search Fundraising/Campaigns
      const { data: campaigns } = await supabase
        .from('fundraisings')
        .select('id, title, description, goal_amount, raised_amount, featured_image_url, category, user_id')
        .eq('status', 'approved' as any)
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .limit(10);

      if (campaigns) {
        const userIds = campaigns.map(c => c.user_id).filter(Boolean);
        const { data: campaignOwners } = await supabase
          .from('profiles')
          .select('user_id, is_premium, premium_expires_at')
          .in('user_id', userIds);

        const premiumMap = new Map(campaignOwners?.map(p => [p.user_id, p.is_premium && p.premium_expires_at && new Date(p.premium_expires_at) > new Date()]) || []);

        campaigns.forEach(campaign => {
          allResults.push({
            id: campaign.id,
            type: 'campaign',
            title: campaign.title,
            subtitle: `₦${campaign.raised_amount?.toLocaleString()} raised of ₦${campaign.goal_amount?.toLocaleString()}`,
            description: campaign.description,
            image: campaign.featured_image_url,
            url: `/fundraising/${campaign.id}`,
            metadata: { goal: campaign.goal_amount, raised: campaign.raised_amount },
            is_premium: premiumMap.get(campaign.user_id) || false,
          });
        });
      }

      // 9. Search Digital Products - include seller's premium status
      const { data: products } = await supabase
        .from('digital_products')
        .select('id, title, description, category, price, preview_url, average_rating, user_id')
        .eq('status', 'active')
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .limit(10);

      if (products) {
        const userIds = products.map(p => p.user_id).filter(Boolean);
        const { data: productSellers } = await supabase
          .from('profiles')
          .select('user_id, is_premium, premium_expires_at')
          .in('user_id', userIds);

        const premiumMap = new Map(productSellers?.map(p => [p.user_id, p.is_premium && p.premium_expires_at && new Date(p.premium_expires_at) > new Date()]) || []);

        products.forEach(product => {
          allResults.push({
            id: product.id,
            type: 'product',
            title: product.title,
            subtitle: `${product.category} • ₦${product.price?.toLocaleString()}`,
            description: product.description,
            image: product.preview_url,
            url: `/product/${product.id}`,
            metadata: { price: product.price, rating: product.average_rating },
            is_premium: premiumMap.get(product.user_id) || false,
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
        .limit(10);

      if (classes) {
        const expertIds = classes.map(c => c.expert_id).filter(Boolean);
        const { data: classExperts } = await supabase
          .from('profiles')
          .select('user_id, is_premium, premium_expires_at')
          .in('user_id', expertIds);

        const premiumMap = new Map(classExperts?.map(p => [p.user_id, p.is_premium && p.premium_expires_at && new Date(p.premium_expires_at) > new Date()]) || []);

        classes.forEach(cls => {
          allResults.push({
            id: cls.id,
            type: 'class',
            title: cls.title,
            subtitle: `${cls.category || 'Expert Class'} • ${cls.status}`,
            description: cls.description || '',
            image: cls.thumbnail_url,
            url: `/expert-class/${cls.id}`,
            metadata: { scheduled_start: cls.scheduled_start, status: cls.status },
            is_premium: premiumMap.get(cls.expert_id) || false,
          });
        });
      }

      // 12. Search Experts - include premium status
      const { data: experts } = await supabase
        .from('profiles')
        .select('user_id, full_name, profession, bio, profile_picture_url, average_rating, is_premium, premium_expires_at')
        .eq('is_expert', true)
        .or(`full_name.ilike.%${searchTerm}%,profession.ilike.%${searchTerm}%,bio.ilike.%${searchTerm}%`)
        .limit(10);

      if (experts) {
        experts.forEach(expert => {
          const isPremiumActive = expert.is_premium && expert.premium_expires_at && new Date(expert.premium_expires_at) > new Date();
          allResults.push({
            id: expert.user_id,
            type: 'expert',
            title: expert.full_name || 'Expert',
            subtitle: expert.profession || 'Professional',
            description: expert.bio || '',
            image: expert.profile_picture_url || undefined,
            url: `/expert/${expert.user_id}`,
            metadata: { rating: expert.average_rating },
            is_premium: isPremiumActive,
          });
        });
      }

      // Sort results: premium users first, then by type order
      return allResults.sort((a, b) => {
        // Premium first
        if (a.is_premium && !b.is_premium) return -1;
        if (!a.is_premium && b.is_premium) return 1;
        return 0;
      });
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
