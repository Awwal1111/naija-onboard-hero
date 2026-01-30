import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/ui/logo';
import { BrandButton } from '@/components/ui/brand-button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Briefcase, Lock, DollarSign, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Job {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  status: string;
  created_at: string;
}

const PublicJobs = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['public-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs_services')
        .select('id, title, description, price, category, status, created_at')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return (data || []) as Job[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const filteredJobs = useMemo(() => {
    if (!jobs) return [];
    if (selectedCategory === 'all') return jobs;
    return jobs.filter(job => job.category === selectedCategory);
  }, [jobs, selectedCategory]);

  const categories = useMemo(() => {
    if (!jobs) return [];
    const cats = [...new Set(jobs.map(j => j.category))];
    return ['all', ...cats];
  }, [jobs]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="sticky top-0 bg-background/95 backdrop-blur-md border-b border-border z-50 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <ArrowLeft className="h-5 w-5" />
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <BrandButton variant="ghost" asChild size="sm">
              <Link to="/login">Log In</Link>
            </BrandButton>
            <BrandButton asChild size="sm">
              <Link to="/signup">Sign Up</Link>
            </BrandButton>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Job Opportunities</h1>
          <p className="text-muted-foreground">Find your next gig or project</p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-accent'
              }`}
            >
              {cat === 'all' ? 'All Jobs' : cat}
            </button>
          ))}
        </div>

        {/* CTA Banner */}
        <Card className="mb-6 bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <span className="text-sm">Sign up to apply for jobs</span>
            </div>
            <BrandButton asChild size="sm">
              <Link to="/signup">Create Free Account</Link>
            </BrandButton>
          </CardContent>
        </Card>

        {/* Job List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <Link key={job.id} to={`/p/job/${job.id}`}>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg line-clamp-1">{job.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {job.description}
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-3 mt-3">
                          <Badge variant="secondary">
                            <Briefcase className="h-3 w-3 mr-1" />
                            {job.category}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 mt-3 text-sm">
                          <span className="font-semibold text-primary flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            {job.price?.toLocaleString()} NC
                          </span>
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {filteredJobs.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No jobs found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicJobs;
