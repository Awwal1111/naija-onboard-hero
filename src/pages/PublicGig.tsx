import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Star, Clock, CheckCircle2, Share2, MessageCircle, ExternalLink, Zap, TrendingUp, Shield, MapPin, Package, Users, HelpCircle, Quote, ShoppingCart } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { BookmarkButton } from '@/components/BookmarkButton';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useGigReviews } from '@/hooks/useGigReviews';
import { usePortfolio } from '@/hooks/usePortfolio';
import { calculateTrustScore, TrustScoreData } from '@/hooks/useTrustScore';
import { TrustScoreBadge, TrustScoreCard } from '@/components/TrustScoreDisplay';
import { GigBoostDialog } from '@/components/GigBoostDialog';
import { GigTestimonialsSection } from '@/components/GigTestimonialsSection';
import { GigFAQSection } from '@/components/GigFAQSection';
import { useGigOrders } from '@/hooks/useGigOrders';
import { ShareButtons } from '@/components/ShareButtons';

export default function PublicGig() {
  const { gigId } = useParams<{ gigId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createOrder } = useGigOrders();
  const [showBoostDialog, setShowBoostDialog] = useState(false);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Fetch gig without requiring profile join (separate query for profile)
  const { data: gig, isLoading, refetch: refetchGig } = useQuery({
    queryKey: ['public-gig-full', gigId],
    queryFn: async () => {
      // First get the gig
      const { data: gigData, error: gigError } = await supabase
        .from('jobs_services')
        .select('*')
        .eq('id', gigId)
        .eq('status', 'active')
        .maybeSingle();

      if (gigError) throw gigError;
      if (!gigData) return null;

      // Then get the profile separately
      const { data: profileData } = await supabase
        .from('profiles')
        .select(`
          user_id,
          full_name, 
          profile_picture_url, 
          is_expert, 
          average_rating,
          bio,
          profession,
          state_name,
          lga_name,
          email_verified,
          phone_verified,
          face_verified,
          created_at,
          connections_count,
          verification_status
        `)
        .eq('user_id', gigData.user_id)
        .maybeSingle();

      return {
        ...gigData,
        profiles: profileData
      };
    },
  });

  const { reviews, stats, addReview, loading: reviewsLoading } = useGigReviews(gigId);
  const seller = gig?.profiles as any;
  const { items: portfolioItems, loading: portfolioLoading } = usePortfolio(seller?.user_id);

  // Calculate trust score for the seller
  const trustScore: TrustScoreData | null = seller ? calculateTrustScore({
    emailVerified: seller.email_verified,
    phoneVerified: seller.phone_verified,
    faceVerified: seller.face_verified,
    averageRating: seller.average_rating || 0,
    ratingCount: stats.count,
    createdAt: seller.created_at,
    connectionsCount: seller.connections_count || 0,
    isExpert: seller.is_expert,
  }) : null;

  const isOwner = user?.id === gig?.user_id;

  const handleShare = async () => {
    try {
      await navigator.share({
        title: gig?.title,
        text: gig?.description,
        url: window.location.href,
      });
    } catch {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleContactSeller = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate(`/chat/${gig?.user_id}`);
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!gig || user.id === gig.user_id) {
      toast.error("You can't order your own service");
      return;
    }
    
    setPlacingOrder(true);
    try {
      const result = await createOrder(
        gig.id,
        gig.user_id,
        gig.title,
        orderNotes || gig.description || '',
        gig.price,
        gig.delivery_days || 7
      );

      if (result && 'order' in result && result.order) {
        setShowOrderDialog(false);
        setOrderNotes('');
        toast.success('Order placed successfully!');
        navigate(`/orders/${result.order.id}`);
      } else if (result && 'error' in result) {
        toast.error(result.error || 'Failed to place order');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to place order');
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!user) {
      toast.error('Please log in to leave a review');
      return;
    }
    if (user.id === gig?.user_id) {
      toast.error('You cannot review your own gig');
      return;
    }
    
    setSubmittingReview(true);
    const result = await addReview(reviewRating, reviewText);
    setSubmittingReview(false);
    
    if (!result.error) {
      setReviewText('');
      setReviewRating(5);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="max-w-4xl mx-auto p-4 space-y-4">
          <Skeleton className="w-full aspect-video rounded-lg" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Helmet>
          <meta name="robots" content="noindex" />
        </Helmet>
        <Card className="p-8 text-center max-w-sm">
          <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-xl font-bold mb-2">Gig Not Found</h1>
          <p className="text-muted-foreground text-sm mb-4">This service is no longer available or has been paused.</p>
          <Button onClick={() => navigate('/jobs')}>Browse Services</Button>
        </Card>
      </div>
    );
  }

  const rating = stats.average || seller?.average_rating || 5.0;
  const isVerifiedExpert = seller?.verification_status === 'verified';
  const images = gig.photo_urls?.filter((url: string) => url) || [];
  const deliveryDays = gig.delivery_days || 7;
  const responseTime = gig.response_time || 'Within 1 hour';

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": gig.title,
    "description": gig.description,
    "category": gig.category,
    "offers": {
      "@type": "Offer",
      "price": gig.price,
      "priceCurrency": "NGN"
    },
    "aggregateRating": stats.count > 0 ? {
      "@type": "AggregateRating",
      "ratingValue": rating,
      "reviewCount": stats.count
    } : undefined
  };

  return (
    <>
      <Helmet>
        <title>{gig.title} - ₦{gig.price?.toLocaleString()} | NaijaLancers</title>
        <meta name="description" content={gig.description || `${gig.title} service on NaijaLancers`} />
        <meta property="og:title" content={gig.title} />
        <meta property="og:description" content={gig.description || gig.title} />
        {images[0] && <meta property="og:image" content={images[0]} />}
        <meta property="og:type" content="product" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={gig.title} />
        <meta name="twitter:description" content={gig.description || gig.title} />
        {images[0] && <meta name="twitter:image" content={images[0]} />}
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <div className="min-h-screen bg-background pb-28">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
          <div className="flex items-center justify-between px-4 py-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              {isOwner && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowBoostDialog(true)}>
                  <Zap className="h-4 w-4 text-yellow-500" />
                  Boost
                </Button>
              )}
              <BookmarkButton type="gig" itemId={gig.id} />
              <Button variant="ghost" size="icon" onClick={handleShare}>
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Image Gallery */}
          {images.length > 0 ? (
            <div className="relative">
              <div className="aspect-video bg-muted">
                <img
                  src={images[activeImageIndex]}
                  alt={gig.title}
                  className="w-full h-full object-cover"
                />
                {(gig.boost_amount || 0) > 0 && (
                  <Badge className="absolute top-3 right-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    BOOSTED
                  </Badge>
                )}
              </div>
              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2 p-2 overflow-x-auto">
                  {images.map((url: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-16 h-12 rounded-md overflow-hidden flex-shrink-0 border-2 transition-colors ${
                        idx === activeImageIndex ? 'border-primary' : 'border-transparent'
                      }`}
                    >
                      <img src={url} alt={`${gig.title} ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative">
              <span className="text-6xl">🎨</span>
              {(gig.boost_amount || 0) > 0 && (
                <Badge className="absolute top-3 right-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  BOOSTED
                </Badge>
              )}
            </div>
          )}

          <div className="p-4 space-y-5">
            {/* Seller Info Card */}
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-14 w-14 ring-2 ring-border cursor-pointer" onClick={() => navigate(`/profile/${gig.user_id}`)}>
                  <AvatarImage src={seller?.profile_picture_url} alt={seller?.full_name} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium text-lg">
                    {seller?.full_name?.charAt(0)?.toUpperCase() || 'S'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold">{seller?.full_name || 'Seller'}</span>
                    {isVerifiedExpert && (
                      <Badge variant="secondary" className="text-[10px] h-5 bg-green-500/10 text-green-600">
                        <Shield className="h-3 w-3 mr-0.5" />
                        Verified
                      </Badge>
                    )}
                    {seller?.is_expert && !isVerifiedExpert && (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{seller?.profession || 'Freelancer'}</p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <div className="flex items-center gap-0.5">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{rating.toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">({stats.count})</span>
                    </div>
                    {trustScore && (
                      <TrustScoreBadge score={trustScore.score} level={trustScore.level} size="sm" />
                    )}
                    {seller?.state_name && (
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" />
                        {seller.state_name}
                      </span>
                    )}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="shrink-0"
                  onClick={() => navigate(`/profile/${gig.user_id}`)}
                >
                  View Profile
                </Button>
              </div>
            </Card>

            {/* Title & Price */}
            <div>
              <h1 className="text-xl font-bold leading-tight mb-3">{gig.title}</h1>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-2xl font-bold text-primary">₦{gig.price?.toLocaleString()}</span>
                <Badge variant="secondary">{gig.category}</Badge>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-2">
              <Card className="p-3 text-center">
                <Clock className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <div className="text-[10px] text-muted-foreground">Delivery</div>
                <div className="font-semibold text-xs">{deliveryDays} days</div>
              </Card>
              <Card className="p-3 text-center">
                <Star className="h-4 w-4 mx-auto text-yellow-400 fill-yellow-400 mb-1" />
                <div className="text-[10px] text-muted-foreground">Rating</div>
                <div className="font-semibold text-xs">{rating.toFixed(1)}</div>
              </Card>
              <Card className="p-3 text-center">
                <MessageCircle className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <div className="text-[10px] text-muted-foreground">Response</div>
                <div className="font-semibold text-xs truncate">{responseTime.replace('Within ', '')}</div>
              </Card>
              <Card className="p-3 text-center">
                <Users className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <div className="text-[10px] text-muted-foreground">Queue</div>
                <div className="font-semibold text-xs">{gig.order_queue || 0} orders</div>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="description" className="w-full">
              <TabsList className="grid grid-cols-5 w-full h-auto">
                <TabsTrigger value="description" className="text-[10px] px-1 py-2">About</TabsTrigger>
                <TabsTrigger value="portfolio" className="text-[10px] px-1 py-2">Portfolio</TabsTrigger>
                <TabsTrigger value="reviews" className="text-[10px] px-1 py-2">Reviews</TabsTrigger>
                <TabsTrigger value="testimonials" className="text-[10px] px-1 py-2">
                  <Quote className="h-3 w-3 mr-0.5" />
                  Clients
                </TabsTrigger>
                <TabsTrigger value="faq" className="text-[10px] px-1 py-2">
                  <HelpCircle className="h-3 w-3 mr-0.5" />
                  FAQ
                </TabsTrigger>
              </TabsList>

              <TabsContent value="description" className="mt-4">
                <Card className="p-4">
                  <h2 className="font-semibold mb-3">About This Service</h2>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {gig.description}
                    </p>
                  </div>
                  
                  {/* Seller Bio */}
                  {seller?.bio && (
                    <div className="mt-4 pt-4 border-t">
                      <h3 className="font-medium mb-2 text-sm">About the Seller</h3>
                      <p className="text-sm text-muted-foreground">{seller.bio}</p>
                    </div>
                  )}

                  {/* Trust Score */}
                  {trustScore && (
                    <div className="mt-4 pt-4 border-t">
                      <TrustScoreCard trustScore={trustScore} showBreakdown={true} />
                    </div>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="portfolio" className="mt-4">
                <Card className="p-4">
                  <h2 className="font-semibold mb-3">Portfolio</h2>
                  {portfolioLoading ? (
                    <div className="grid grid-cols-2 gap-3">
                      {[1, 2, 3, 4].map(i => (
                        <Skeleton key={i} className="aspect-video rounded-lg" />
                      ))}
                    </div>
                  ) : portfolioItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No portfolio items yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {portfolioItems.map(item => (
                        <Card key={item.id} className="overflow-hidden group cursor-pointer">
                          {item.media_url ? (
                            <div className="aspect-video bg-muted">
                              <img 
                                src={item.media_url} 
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            </div>
                          ) : (
                            <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                              <span className="text-2xl">📁</span>
                            </div>
                          )}
                          <div className="p-2">
                            <p className="font-medium text-xs truncate">{item.title}</p>
                            {item.project_url && (
                              <a 
                                href={item.project_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-[10px] text-primary flex items-center gap-0.5 mt-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                View Project
                              </a>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="reviews" className="mt-4 space-y-4">
                {/* Review Stats */}
                <Card className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">{rating.toFixed(1)}</div>
                      <div className="flex items-center justify-center gap-0.5 mt-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star 
                            key={star} 
                            className={`h-4 w-4 ${star <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} 
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{stats.count} reviews</p>
                    </div>
                    <div className="flex-1 space-y-1">
                      {[5, 4, 3, 2, 1].map(star => {
                        const count = reviews.filter(r => r.rating === star).length;
                        const percentage = stats.count > 0 ? (count / stats.count) * 100 : 0;
                        return (
                          <div key={star} className="flex items-center gap-2 text-xs">
                            <span className="w-3">{star}</span>
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-yellow-400 rounded-full" 
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="w-8 text-muted-foreground">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>

                {/* Write Review */}
                {user && user.id !== gig.user_id && (
                  <Card className="p-4">
                    <h3 className="font-medium mb-3 text-sm">Write a Review</h3>
                    <div className="flex items-center gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          onClick={() => setReviewRating(star)}
                          className="focus:outline-none"
                        >
                          <Star 
                            className={`h-6 w-6 transition-colors ${
                              star <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground hover:text-yellow-400'
                            }`} 
                          />
                        </button>
                      ))}
                    </div>
                    <Textarea
                      placeholder="Share your experience with this service..."
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      rows={3}
                      className="mb-3"
                    />
                    <Button 
                      onClick={handleSubmitReview}
                      disabled={submittingReview}
                      size="sm"
                    >
                      {submittingReview ? 'Submitting...' : 'Submit Review'}
                    </Button>
                  </Card>
                )}

                {/* Reviews List */}
                <div className="space-y-3">
                  {reviewsLoading ? (
                    [1, 2, 3].map(i => (
                      <Card key={i} className="p-4">
                        <div className="flex items-start gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-full" />
                          </div>
                        </div>
                      </Card>
                    ))
                  ) : reviews.length === 0 ? (
                    <Card className="p-8 text-center text-muted-foreground">
                      <p>No reviews yet. Be the first to review!</p>
                    </Card>
                  ) : (
                    reviews.map(review => (
                      <Card key={review.id} className="p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={review.reviewer?.profile_picture_url || ''} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {review.reviewer?.full_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{review.reviewer?.full_name || 'Anonymous'}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(review.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-0.5 mt-0.5 mb-2">
                              {[1, 2, 3, 4, 5].map(star => (
                                <Star 
                                  key={star} 
                                  className={`h-3 w-3 ${star <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} 
                                />
                              ))}
                            </div>
                            {review.comment && (
                              <p className="text-sm text-muted-foreground">{review.comment}</p>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="testimonials" className="mt-4">
                <GigTestimonialsSection gigId={gig.id} gigOwnerId={gig.user_id} />
              </TabsContent>

              <TabsContent value="faq" className="mt-4">
                <GigFAQSection gigId={gig.id} isOwner={isOwner} />
              </TabsContent>
            </Tabs>

            {/* Share Section */}
            <Card className="p-4 mt-6">
              <p className="text-sm font-medium mb-3 flex items-center gap-2">
                <Share2 className="h-4 w-4" />
                Share this gig
              </p>
              <ShareButtons
                title={gig.title}
                text={`🔥 Check out "${gig.title}" on NaijaLancers - Starting at ₦${gig.price?.toLocaleString()}!`}
                url={`/gig/${gig.id}`}
                showLabels
              />
            </Card>
          </div>
        </div>

        {/* Fixed Bottom CTA */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 safe-bottom">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">Starting at</div>
              <div className="text-xl font-bold text-primary">₦{gig.price?.toLocaleString()}</div>
            </div>
            {!isOwner && (
              <Button 
                size="lg" 
                className="gap-2 px-6"
                onClick={() => {
                  if (!user) {
                    navigate('/login');
                    return;
                  }
                  setShowOrderDialog(true);
                }}
              >
                <ShoppingCart className="h-4 w-4" />
                Order Now
              </Button>
            )}
            <Button 
              size="lg" 
              variant={isOwner ? "default" : "outline"}
              className="gap-2 px-6"
              onClick={handleContactSeller}
            >
              <MessageCircle className="h-4 w-4" />
              {isOwner ? 'View Messages' : 'Contact'}
            </Button>
          </div>
        </div>

        {/* Floating Chat Button */}
        {!isOwner && user && (
          <Button
            size="icon"
            className="fixed bottom-24 right-4 h-14 w-14 rounded-full shadow-lg z-20"
            onClick={handleContactSeller}
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        )}
      </div>

      {/* Order Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Place Order</DialogTitle>
            <DialogDescription>
              You're about to order: {gig.title}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Service Price</span>
              <span className="font-bold text-primary">₦{gig.price?.toLocaleString()}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Delivery Time</span>
              <span className="font-medium">{gig.delivery_days || 7} days</span>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="order-notes">Requirements / Notes (Optional)</Label>
              <Textarea
                id="order-notes"
                placeholder="Describe what you need from the seller..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowOrderDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handlePlaceOrder} disabled={placingOrder}>
              {placingOrder ? 'Placing Order...' : `Pay ₦${gig.price?.toLocaleString()}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Boost Dialog */}
      {isOwner && (
        <GigBoostDialog
          open={showBoostDialog}
          onOpenChange={setShowBoostDialog}
          gigId={gig.id}
          gigTitle={gig.title}
          currentBoost={gig.boost_amount || 0}
          onSuccess={() => refetchGig()}
        />
      )}
    </>
  );
}
