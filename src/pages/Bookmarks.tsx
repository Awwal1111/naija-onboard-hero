import { useState } from 'react';
import ResponsiveLayout from '@/components/ResponsiveLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Bookmark, Briefcase, Users, GraduationCap, Package, ShoppingBag, Trash2, ExternalLink } from 'lucide-react';
import { useBookmarks, BookmarkType } from '@/hooks/useBookmarks';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

const Bookmarks = () => {
  const [activeTab, setActiveTab] = useState<BookmarkType>('job');
  const { bookmarks, getBookmarksByType, removeBookmark, loading } = useBookmarks();
  const navigate = useNavigate();

  const jobBookmarks = getBookmarksByType('job');
  const expertBookmarks = getBookmarksByType('expert');
  const courseBookmarks = getBookmarksByType('course');
  const productBookmarks = getBookmarksByType('product');
  const gigBookmarks = getBookmarksByType('gig');

  // Fetch job details
  const { data: jobs, isLoading: loadingJobs } = useQuery({
    queryKey: ['bookmarked-jobs', jobBookmarks.map(b => b.itemId)],
    queryFn: async () => {
      if (jobBookmarks.length === 0) return [];
      const { data } = await supabase
        .from('job_posts')
        .select('*, profiles:user_id(*)')
        .in('id', jobBookmarks.map(b => b.itemId));
      return data || [];
    },
    enabled: jobBookmarks.length > 0
  });

  // Fetch expert details
  const { data: experts, isLoading: loadingExperts } = useQuery({
    queryKey: ['bookmarked-experts', expertBookmarks.map(b => b.itemId)],
    queryFn: async () => {
      if (expertBookmarks.length === 0) return [];
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', expertBookmarks.map(b => b.itemId))
        .eq('is_expert', true);
      return data || [];
    },
    enabled: expertBookmarks.length > 0
  });

  // Fetch course details
  const { data: courses, isLoading: loadingCourses } = useQuery({
    queryKey: ['bookmarked-courses', courseBookmarks.map(b => b.itemId)],
    queryFn: async () => {
      if (courseBookmarks.length === 0) return [];
      const { data } = await supabase
        .from('courses')
        .select('*, profiles:user_id(*)')
        .in('id', courseBookmarks.map(b => b.itemId));
      return data || [];
    },
    enabled: courseBookmarks.length > 0
  });

  // Fetch product details
  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ['bookmarked-products', productBookmarks.map(b => b.itemId)],
    queryFn: async () => {
      if (productBookmarks.length === 0) return [];
      const { data } = await supabase
        .from('digital_products')
        .select('*, profiles:user_id(*)')
        .in('id', productBookmarks.map(b => b.itemId));
      return data || [];
    },
    enabled: productBookmarks.length > 0
  });

  // Fetch gig details
  const { data: gigs, isLoading: loadingGigs } = useQuery({
    queryKey: ['bookmarked-gigs', gigBookmarks.map(b => b.itemId)],
    queryFn: async () => {
      if (gigBookmarks.length === 0) return [];
      const { data } = await supabase
        .from('jobs_services')
        .select('*, profiles:user_id(*)')
        .in('id', gigBookmarks.map(b => b.itemId));
      return data || [];
    },
    enabled: gigBookmarks.length > 0
  });

  const renderEmptyState = (type: string) => (
    <div className="text-center py-12">
      <Bookmark className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">No saved {type}</h3>
      <p className="text-muted-foreground text-sm">
        Items you save will appear here
      </p>
    </div>
  );

  const renderLoading = () => (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <ResponsiveLayout>
      <div className="container max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3">
          <Bookmark className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Saved Items</h1>
            <p className="text-muted-foreground text-sm">
              {bookmarks.length} items saved
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as BookmarkType)}>
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="job" className="flex items-center gap-1.5">
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">Jobs</span>
              {jobBookmarks.length > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5">{jobBookmarks.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="expert" className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Experts</span>
              {expertBookmarks.length > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5">{expertBookmarks.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="course" className="flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">Courses</span>
              {courseBookmarks.length > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5">{courseBookmarks.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="product" className="flex items-center gap-1.5">
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Products</span>
              {productBookmarks.length > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5">{productBookmarks.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="gig" className="flex items-center gap-1.5">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Gigs</span>
              {gigBookmarks.length > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5">{gigBookmarks.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="job" className="mt-4 space-y-4">
            {loadingJobs ? renderLoading() : 
             !jobs || jobs.length === 0 ? renderEmptyState('jobs') : (
              jobs.map(job => (
                <Card key={job.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">{job.title}</h3>
                        <p className="text-muted-foreground text-sm">{job.company_name}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {job.job_type && <Badge variant="outline">{job.job_type}</Badge>}
                          {job.location && <Badge variant="secondary">{job.location}</Badge>}
                          {job.budget_min && job.budget_max && (
                            <Badge>₦{job.budget_min.toLocaleString()} - ₦{job.budget_max.toLocaleString()}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/jobs/${job.id}`)}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => removeBookmark('job', job.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="expert" className="mt-4 space-y-4">
            {loadingExperts ? renderLoading() : 
             !experts || experts.length === 0 ? renderEmptyState('experts') : (
              experts.map(expert => (
                <Card key={expert.user_id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={(expert as any).profile_picture_url} />
                        <AvatarFallback>{expert.full_name?.[0] || 'E'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{expert.full_name}</h3>
                        <p className="text-muted-foreground text-sm">{expert.profession}</p>
                        {expert.average_rating && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-yellow-500">★</span>
                            <span className="text-sm">{expert.average_rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/profile/${expert.user_id}`)}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => removeBookmark('expert', expert.user_id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="course" className="mt-4 space-y-4">
            {loadingCourses ? renderLoading() : 
             !courses || courses.length === 0 ? renderEmptyState('courses') : (
              courses.map(course => (
                <Card key={course.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {course.thumbnail_url && (
                        <img src={course.thumbnail_url} alt={course.title} className="h-20 w-32 object-cover rounded-lg" />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{course.title}</h3>
                        <p className="text-muted-foreground text-sm line-clamp-2">{course.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge>₦{course.price.toLocaleString()}</Badge>
                          {course.average_rating && (
                            <span className="text-sm text-yellow-500">★ {course.average_rating.toFixed(1)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/courses/${course.id}`)}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => removeBookmark('course', course.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="product" className="mt-4 space-y-4">
            {loadingProducts ? renderLoading() : 
             !products || products.length === 0 ? renderEmptyState('products') : (
              products.map(product => (
                <Card key={product.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {product.preview_url && (
                        <img src={product.preview_url} alt={product.title} className="h-20 w-32 object-cover rounded-lg" />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{product.title}</h3>
                        <p className="text-muted-foreground text-sm line-clamp-2">{product.description}</p>
                        <Badge className="mt-2">₦{product.price.toLocaleString()}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/products/${product.id}`)}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => removeBookmark('product', product.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="gig" className="mt-4 space-y-4">
            {loadingGigs ? renderLoading() : 
             !gigs || gigs.length === 0 ? renderEmptyState('gigs') : (
              gigs.map(gig => (
                <Card key={gig.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{gig.title}</h3>
                        <p className="text-muted-foreground text-sm line-clamp-2">{gig.description}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge>{gig.category}</Badge>
                          <Badge variant="secondary">₦{gig.price.toLocaleString()}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/gigs/${gig.id}`)}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => removeBookmark('gig', gig.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ResponsiveLayout>
  );
};

export default Bookmarks;
