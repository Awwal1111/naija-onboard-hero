import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, GraduationCap, Star, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function PublicCourse() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const { data: course, isLoading } = useQuery({
    queryKey: ['public-course', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .eq('status', 'active')
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Skeleton className="h-8 w-32 mb-6" />
        <Card className="p-6">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-4 w-48 mb-4" />
          <Skeleton className="h-32 w-full" />
        </Card>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4 text-center">
        <Helmet>
          <meta name="robots" content="noindex" />
        </Helmet>
        <h1 className="text-2xl font-bold mb-4">Course Not Found</h1>
        <p className="text-muted-foreground mb-6">This course is not available.</p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": course.title,
    "description": course.description,
    "provider": {
      "@type": "Organization",
      "name": "NaijaLancers"
    },
    "instructor": course.instructor_name ? {
      "@type": "Person",
      "name": course.instructor_name
    } : undefined,
    "offers": {
      "@type": "Offer",
      "price": course.price,
      "priceCurrency": "NGN"
    },
    "aggregateRating": course.average_rating ? {
      "@type": "AggregateRating",
      "ratingValue": course.average_rating,
      "bestRating": "5"
    } : undefined
  };

  const canonicalUrl = `https://naijalancers.name.ng/p/course/${courseId}`;

  return (
    <>
      <Helmet>
        <title>{course.title} - Online Course | NaijaLancers</title>
        <meta name="description" content={course.description || `Learn ${course.title} on NaijaLancers`} />
        <link rel="canonical" href={canonicalUrl} />
        
        <meta property="og:title" content={course.title} />
        <meta property="og:description" content={course.description || course.title} />
        {course.thumbnail_url && <meta property="og:image" content={course.thumbnail_url} />}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content="NaijaLancers" />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={course.title} />
        <meta name="twitter:description" content={course.description || course.title} />
        {course.thumbnail_url && <meta name="twitter:image" content={course.thumbnail_url} />}
        
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card className="p-6">
          {course.thumbnail_url && (
            <img
              src={course.thumbnail_url}
              alt={course.title}
              className="w-full h-64 object-cover rounded-lg mb-6"
            />
          )}

          <div className="flex items-start gap-4 mb-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
              {course.instructor_name && (
                <p className="text-muted-foreground">by {course.instructor_name}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mb-6">
            {course.average_rating && (
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>{course.average_rating.toFixed(1)}</span>
              </div>
            )}
            {course.duration_hours && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{course.duration_hours} hours</span>
              </div>
            )}
            {course.level && <Badge variant="secondary">{course.level}</Badge>}
          </div>

          <div className="text-3xl font-bold text-primary mb-6">
            ₦{course.price?.toLocaleString()}
          </div>

          <p className="text-muted-foreground mb-6 whitespace-pre-wrap">
            {course.description}
          </p>

          <Button size="lg" onClick={() => navigate('/login')}>
            Enroll Now
          </Button>
        </Card>
      </div>
    </>
  );
}
