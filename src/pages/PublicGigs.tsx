import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';
import { Logo } from '@/components/ui/logo';
import { BrandButton } from '@/components/ui/brand-button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { GigCategoryChips } from '@/components/gigs/GigCategoryChips';
import { ArrowLeft, Lock, Search } from 'lucide-react';
import { getCategoryIcon } from '@/lib/gigCategories';
import { BrandInput } from '@/components/ui/brand-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserCountry } from '@/hooks/useUserCountry';
import { formatPriceForDisplay } from '@/components/CurrencyDisplay';

interface Gig {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  status: string;
  created_at: string;
  photo_urls: string[] | null;
  seller_name?: string | null;
  seller_username?: string | null;
  seller_profession?: string | null;
  seller_picture?: string | null;
}

const PublicGigs = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const { isNigerian } = useUserCountry();

  const { data: gigs, isLoading, isError, refetch } = useQuery({
    queryKey: ['public-gigs'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_gigs' as any);
      
      if (error) throw error;
      return (data || []) as Gig[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const filteredGigs = useMemo(() => {
    if (!gigs) return [];
    const query = searchQuery.trim().toLowerCase();
    const filtered = gigs.filter(gig => {
      const matchesCategory = selectedCategory === 'all' || gig.category === selectedCategory;
      const matchesSearch = !query || [
        gig.title,
        gig.description,
        gig.category,
        gig.seller_name,
        gig.seller_username,
        gig.seller_profession,
      ].some(value => value?.toLowerCase().includes(query));
      return matchesCategory && matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'price_low') return (a.price || 0) - (b.price || 0);
      if (sortBy === 'price_high') return (b.price || 0) - (a.price || 0);
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }, [gigs, selectedCategory, searchQuery, sortBy]);

  const gigCounts = useMemo(() => {
    if (!gigs) return {};
    const counts: Record<string, number> = {};
    gigs.forEach(gig => {
      counts[gig.category] = (counts[gig.category] || 0) + 1;
    });
    return counts;
  }, [gigs]);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Freelance Services on NaijaLancers",
    "description": "Browse skilled freelancers offering services in various categories",
    "numberOfItems": filteredGigs.length,
    "itemListElement": filteredGigs.slice(0, 10).map((gig, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "Service",
        "name": gig.title,
        "description": gig.description,
        "url": `https://naijalancers.name.ng/p/gig/${gig.id}`
      }
    }))
  };

  return (
    <>
      <Helmet>
        <title>Browse Services & Gigs - Hire Freelancers | NaijaLancers</title>
        <meta name="description" content="Find skilled Nigerian freelancers offering services in design, development, writing, marketing and more. Browse verified gigs and hire talent today." />
        <link rel="canonical" href="https://naijalancers.name.ng/p/gigs" />
        
        <meta property="og:title" content="Browse Freelance Services | NaijaLancers" />
        <meta property="og:description" content="Find skilled freelancers for your projects. Design, development, writing, marketing and more." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://naijalancers.name.ng/p/gigs" />
        <meta property="og:site_name" content="NaijaLancers" />
        
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Browse Freelance Services | NaijaLancers" />
        <meta name="twitter:description" content="Find skilled freelancers for your projects" />
        
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>
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
          <h1 className="text-2xl font-bold mb-2">Browse Services</h1>
          <p className="text-muted-foreground">Find skilled freelancers for your projects</p>
        </div>

        {/* Search and sorting */}
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <BrandInput
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search services, skills or sellers..."
              aria-label="Search services"
              className="pl-9"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[190px]" aria-label="Sort services">
              <SelectValue placeholder="Sort services" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="price_low">Price: low to high</SelectItem>
              <SelectItem value="price_high">Price: high to low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Category Filter */}
        <GigCategoryChips 
          selected={selectedCategory} 
          onSelect={setSelectedCategory}
          gigCounts={gigCounts}
        />

        {/* CTA Banner */}
        <Card className="mb-6 bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <span className="text-sm">Sign up to message sellers and place orders</span>
            </div>
            <BrandButton asChild size="sm">
              <Link to="/signup">Create Free Account</Link>
            </BrandButton>
          </CardContent>
        </Card>

        {/* Gig Grid */}
        {isError ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-3">Services could not be loaded right now.</p>
            <BrandButton onClick={() => refetch()} variant="outline">Try again</BrandButton>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGigs.map((gig) => (
              <Link key={gig.id} to={`/p/gig/${gig.id}`}>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
                  {gig.photo_urls?.[0] && (
                    <div className="aspect-video bg-muted overflow-hidden">
                      <img 
                        src={gig.photo_urls[0]} 
                        alt={gig.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <h3 className="font-semibold line-clamp-2 mb-2">{gig.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {gig.description}
                    </p>
                    {(gig.seller_name || gig.seller_profession) && (
                      <p className="text-xs text-muted-foreground mb-3">
                        By <span className="font-medium text-foreground">{gig.seller_name || gig.seller_username}</span>
                        {gig.seller_profession ? ` · ${gig.seller_profession}` : ''}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        {getCategoryIcon(gig.category)} {gig.category}
                      </Badge>
                      <span className="font-bold text-primary">
                        {formatPriceForDisplay(gig.price, isNigerian)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {filteredGigs.length === 0 && !isLoading && !isError && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-3">No services match your search or filters.</p>
            {(searchQuery || selectedCategory !== 'all') && (
              <BrandButton variant="outline" size="sm" onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}>
                Clear search and filters
              </BrandButton>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default PublicGigs;
