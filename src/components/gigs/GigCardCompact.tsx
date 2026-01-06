import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, MapPin, CheckCircle2, Zap } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getCategoryPlaceholder, normalizeCategory } from '@/lib/gigCategories';

interface GigCardCompactProps {
  id: string;
  title: string;
  price: number;
  category: string;
  photo_urls?: string[];
  seller_name?: string;
  seller_picture?: string;
  seller_is_expert?: boolean;
  seller_state?: string;
  average_rating?: number;
  review_count?: number;
  boost_amount?: number;
  className?: string;
}

// Reduced height compact card for mobile grid
export const GigCardCompact: React.FC<GigCardCompactProps> = ({
  id,
  title,
  price,
  category,
  photo_urls,
  seller_name,
  seller_picture,
  seller_is_expert = false,
  seller_state,
  average_rating,
  review_count = 0,
  boost_amount = 0,
  className,
}) => {
  const navigate = useNavigate();
  
  const normalizedCategory = normalizeCategory(category);
  const hasUserImage = photo_urls && photo_urls.length > 0 && photo_urls[0] && !photo_urls[0].includes('placeholder');
  const coverImage = hasUserImage ? photo_urls[0] : getCategoryPlaceholder(normalizedCategory);
  const displayRating = average_rating || 0;

  return (
    <div
      onClick={() => navigate(`/gig/${id}`)}
      className={cn(
        "group cursor-pointer bg-card border border-border rounded-lg overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/30",
        className
      )}
    >
      {/* Cover Image - Reduced height */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={coverImage}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {/* Boosted Badge */}
        {boost_amount > 0 && (
          <div className="absolute top-1.5 left-1.5">
            <Badge className="bg-gradient-to-r from-orange-500 to-yellow-400 text-white text-[9px] h-5 gap-0.5 border-0 shadow-sm">
              <Zap className="h-3 w-3 fill-white" />
              Featured
            </Badge>
          </div>
        )}
        {/* Expert Badge */}
        {seller_is_expert && (
          <div className="absolute top-1.5 right-1.5">
            <Badge className="bg-green-500/90 text-white text-[8px] h-5 px-1.5 border-0">
              <CheckCircle2 className="h-3 w-3" />
            </Badge>
          </div>
        )}
      </div>

      {/* Content - Compact */}
      <div className="p-2.5 space-y-1.5">
        {/* Seller */}
        <div className="flex items-center gap-1.5">
          <Avatar className="h-5 w-5">
            <AvatarImage src={seller_picture || undefined} />
            <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
              {seller_name?.charAt(0) || 'S'}
            </AvatarFallback>
          </Avatar>
          <span className="text-[11px] text-muted-foreground truncate flex-1">
            {seller_name || 'Seller'}
          </span>
          {seller_state && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <MapPin className="h-2.5 w-2.5" />
              {seller_state.slice(0, 3)}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-xs font-medium leading-tight text-foreground line-clamp-2 group-hover:text-primary transition-colors min-h-[32px]">
          {title}
        </h3>

        {/* Price & Rating Row */}
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <span className="text-sm font-bold text-primary">₦{price.toLocaleString()}</span>
          <div className="flex items-center gap-0.5">
            <Star className={cn("h-3 w-3", displayRating > 0 ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")} />
            <span className="text-[10px] font-medium">
              {displayRating > 0 ? displayRating.toFixed(1) : 'New'}
            </span>
            {review_count > 0 && (
              <span className="text-[9px] text-muted-foreground">({review_count})</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GigCardCompact;
