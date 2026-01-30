import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/ui/logo';
import { BrandButton } from '@/components/ui/brand-button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CategoryChips } from '@/components/experts/CategoryChips';
import { ArrowLeft, Star, MapPin, Lock, CheckCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Expert {
  user_id: string;
  full_name: string;
  profession: string | null;
  bio: string | null;
  profile_picture_url: string | null;
  state_name: string | null;
  average_rating: number | null;
}

const PublicExperts = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { data: experts, isLoading } = useQuery({
    queryKey: ['public-experts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, profession, bio, profile_picture_url, state_name, average_rating')
        .eq('is_expert', true)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return (data || []) as Expert[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const filteredExperts = useMemo(() => {
    if (!experts) return [];
    if (selectedCategory === 'all') return experts;
    return experts.filter(expert => expert.profession === selectedCategory);
  }, [experts, selectedCategory]);

  const expertCounts = useMemo(() => {
    if (!experts) return {};
    const counts: Record<string, number> = {};
    experts.forEach(expert => {
      if (expert.profession) {
        counts[expert.profession] = (counts[expert.profession] || 0) + 1;
      }
    });
    return counts;
  }, [experts]);

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

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Verified Experts</h1>
          <p className="text-muted-foreground">Connect with top professionals in various fields</p>
        </div>

        {/* Category Filter */}
        <CategoryChips 
          selected={selectedCategory} 
          onSelect={setSelectedCategory}
          expertCounts={expertCounts}
        />

        {/* CTA Banner */}
        <Card className="mb-6 bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <span className="text-sm">Sign up to hire experts and join live classes</span>
            </div>
            <BrandButton asChild size="sm">
              <Link to="/signup">Create Free Account</Link>
            </BrandButton>
          </CardContent>
        </Card>

        {/* Expert Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExperts.map((expert) => (
              <Link key={expert.user_id} to={`/p/expert/${expert.user_id}`}>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={expert.profile_picture_url || undefined} />
                        <AvatarFallback className="text-lg">
                          {expert.full_name?.charAt(0) || 'E'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-semibold truncate">{expert.full_name}</h3>
                          <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{expert.profession}</p>
                        {expert.state_name && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3" />
                            <span>{expert.state_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-3">
                      {expert.bio || 'Verified expert on NaijaLancers'}
                    </p>

                    <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                        <span className="text-sm font-medium">
                          {expert.average_rating?.toFixed(1) || '5.0'}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Available for hire
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {filteredExperts.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No experts found in this category</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicExperts;
