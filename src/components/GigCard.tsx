import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, MapPin, CheckCircle2, Zap } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { BookmarkButton } from '@/components/BookmarkButton';
import { cn } from '@/lib/utils';

export interface GigCardProps {
  id: string;
  title: string;
  description?: string;
  price: number;
  category: string;
  photo_urls?: string[];
  seller_name?: string;
  seller_picture?: string;
  seller_rating?: number;
  seller_is_expert?: boolean;
  seller_id?: string;
  seller_state?: string;
  average_rating?: number;
  review_count?: number;
  created_at?: string;
  boost_amount?: number;
  className?: string;
}

export const GigCard: React.FC<GigCardProps> = ({
  id,
  title,
  description,
  price,
  category,
  photo_urls,
  seller_name,
  seller_picture,
  seller_rating = 0,
  seller_is_expert = false,
  seller_id,
  seller_state,
  average_rating,
  review_count = 0,
  boost_amount = 0,
  className,
}) => {
  const navigate = useNavigate();
  
  const handleCardClick = () => {
    navigate(`/gig/${id}`);
  };

  const handleSellerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (seller_id) {
      navigate(`/profile/${seller_id}`);
    }
  };

  const coverImage = photo_urls?.[0] || '/placeholder.svg';
  // Use actual review data, fall back to seller rating if no reviews yet
  const displayRating = average_rating || seller_rating || 0;
  const displayReviewCount = review_count;

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        "group cursor-pointer bg-card border border-border rounded-lg overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/30",
        className
      )}
    >
      {/* Cover Image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <img
          src={coverImage}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {/* Boosted Badge */}
        {boost_amount > 0 && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white text-[10px] gap-0.5 border-0">
              <Zap className="h-3 w-3 fill-white" />
              BOOSTED
            </Badge>
          </div>
        )}
        {/* Bookmark Button */}
        <div 
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <BookmarkButton type="gig" itemId={id} />
        </div>
        {/* Category Badge */}
        <div className="absolute bottom-2 left-2">
          <Badge variant="secondary" className="text-[10px] bg-background/90 backdrop-blur-sm">
            {category}
          </Badge>
        </div>
      </div>


      {/* Content */}
      <div className="p-3 space-y-2.5">
        {/* Seller Info */}
        <div 
          className="flex items-center gap-2"
          onClick={handleSellerClick}
        >
          <Avatar className="h-6 w-6 ring-1 ring-border">
            <AvatarImage src={seller_picture || undefined} alt={seller_name || 'Seller'} />
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
              {seller_name?.charAt(0)?.toUpperCase() || 'S'}
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-xs font-medium text-foreground truncate hover:underline">
              {seller_name || 'Seller'}
            </span>
            {seller_is_expert && (
              <CheckCircle2 className="h-3 w-3 text-primary flex-shrink-0" />
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-sm font-medium leading-tight text-foreground line-clamp-2 group-hover:text-primary transition-colors min-h-[2.5rem]">
          {title}
        </h3>

        {/* Rating & Location */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Star className={cn("h-3.5 w-3.5", displayRating > 0 ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")} />
            <span className="text-xs font-semibold text-foreground">
              {displayRating > 0 ? displayRating.toFixed(1) : 'New'}
            </span>
            {displayReviewCount > 0 && (
              <span className="text-[10px] text-muted-foreground">({displayReviewCount})</span>
            )}
          </div>
          {seller_state && (
            <div className="flex items-center gap-0.5 text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="text-[10px] truncate max-w-[60px]">{seller_state}</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Price */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Starting at</span>
          <span className="text-sm font-bold text-foreground">₦{price.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

// Compact horizontal card for lists
export const GigCardCompact: React.FC<GigCardProps> = ({
  id,
  title,
  price,
  category,
  photo_urls,
  seller_name,
  seller_picture,
  seller_rating = 0,
  seller_is_expert = false,
  seller_id,
  className,
}) => {
  const navigate = useNavigate();
  
  const coverImage = photo_urls?.[0] || '/placeholder.svg';
  const displayRating = seller_rating || 5.0;

  return (
    <div
      onClick={() => navigate(`/gig/${id}`)}
      className={cn(
        "group cursor-pointer flex gap-3 p-3 bg-card border border-border rounded-lg transition-all duration-200 hover:shadow-md hover:border-primary/30",
        className
      )}
    >
      {/* Thumbnail */}
      <div className="relative w-24 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
        <img
          src={coverImage}
          alt={title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <Avatar className="h-4 w-4">
              <AvatarImage src={seller_picture || undefined} />
              <AvatarFallback className="text-[8px]">{seller_name?.charAt(0) || 'S'}</AvatarFallback>
            </Avatar>
            <span className="text-[11px] text-muted-foreground truncate">{seller_name}</span>
            {seller_is_expert && <CheckCircle2 className="h-3 w-3 text-primary" />}
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="text-[11px] font-medium">{displayRating.toFixed(1)}</span>
          </div>
          <span className="text-xs font-bold text-primary">₦{price.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export default GigCard;
