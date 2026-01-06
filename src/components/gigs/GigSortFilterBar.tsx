import React from 'react';
import { SlidersHorizontal, ChevronDown, ArrowUpDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type SortOption = 'relevance' | 'price_low' | 'price_high' | 'rating' | 'newest' | 'popular';

interface GigSortFilterBarProps {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  priceRange?: [number, number] | null;
  onPriceRangeChange?: (range: [number, number] | null) => void;
  expertOnly: boolean;
  onExpertOnlyChange: (value: boolean) => void;
  activeFilterCount: number;
  onClearFilters: () => void;
  totalResults: number;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'newest', label: 'Newest First' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'popular', label: 'Most Popular' },
];

const PRICE_RANGES: { label: string; range: [number, number] | null }[] = [
  { label: 'Any Price', range: null },
  { label: 'Under ₦5,000', range: [0, 5000] },
  { label: '₦5,000 - ₦20,000', range: [5000, 20000] },
  { label: '₦20,000 - ₦50,000', range: [20000, 50000] },
  { label: '₦50,000+', range: [50000, 1000000] },
];

export const GigSortFilterBar: React.FC<GigSortFilterBarProps> = ({
  sortBy,
  onSortChange,
  priceRange,
  onPriceRangeChange,
  expertOnly,
  onExpertOnlyChange,
  activeFilterCount,
  onClearFilters,
  totalResults,
}) => {
  const selectedSort = SORT_OPTIONS.find(opt => opt.value === sortBy);
  const selectedPriceLabel = PRICE_RANGES.find(
    p => JSON.stringify(p.range) === JSON.stringify(priceRange)
  )?.label || 'Any Price';

  return (
    <div className="sticky top-[160px] z-20 bg-background/95 backdrop-blur-sm border-b py-2 -mx-4 px-4">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        {/* Sort Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 flex-shrink-0">
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{selectedSort?.label}</span>
              <span className="sm:hidden">Sort</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Sort By</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {SORT_OPTIONS.map(option => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onSortChange(option.value)}
                className={cn(sortBy === option.value && 'bg-accent')}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Price Filter */}
        {onPriceRangeChange && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant={priceRange ? 'secondary' : 'outline'} 
                size="sm" 
                className="h-8 gap-1.5 flex-shrink-0"
              >
                <span>₦ {selectedPriceLabel === 'Any Price' ? 'Price' : selectedPriceLabel}</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel>Price Range</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {PRICE_RANGES.map(option => (
                <DropdownMenuItem
                  key={option.label}
                  onClick={() => onPriceRangeChange(option.range)}
                  className={cn(
                    JSON.stringify(priceRange) === JSON.stringify(option.range) && 'bg-accent'
                  )}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Expert Only Toggle */}
        <Button
          variant={expertOnly ? 'secondary' : 'outline'}
          size="sm"
          className="h-8 gap-1.5 flex-shrink-0"
          onClick={() => onExpertOnlyChange(!expertOnly)}
        >
          ✓ Verified Experts
        </Button>

        {/* Clear Filters */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-destructive hover:text-destructive flex-shrink-0"
            onClick={onClearFilters}
          >
            <X className="h-3 w-3" />
            Clear ({activeFilterCount})
          </Button>
        )}

        {/* Results Count */}
        <div className="ml-auto flex-shrink-0">
          <span className="text-xs text-muted-foreground">
            {totalResults} {totalResults === 1 ? 'result' : 'results'}
          </span>
        </div>
      </div>
    </div>
  );
};
