import React from 'react';
import { Search, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { BrandInput } from '@/components/ui/brand-input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Abuja', 'Gombe', 'Imo',
  'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
  'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba',
  'Yobe', 'Zamfara'
];

export type SortOption = 'relevance' | 'rating' | 'experience' | 'recent';

interface ExpertFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  stateFilter: string;
  onStateChange: (value: string) => void;
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
  verifiedOnly: boolean;
  onVerifiedChange: (value: boolean) => void;
  activeFiltersCount: number;
}

export const ExpertFilters: React.FC<ExpertFiltersProps> = ({
  searchQuery,
  onSearchChange,
  stateFilter,
  onStateChange,
  sortBy,
  onSortChange,
  verifiedOnly,
  onVerifiedChange,
  activeFiltersCount,
}) => {
  const sortLabels: Record<SortOption, string> = {
    relevance: 'Relevance',
    rating: 'Highest Rated',
    experience: 'Most Experience',
    recent: 'Recently Active',
  };

  return (
    <div className="space-y-3 mb-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <BrandInput
          placeholder="Search by name or skill..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-4"
        />
      </div>

      {/* Filter Row */}
      <div className="flex gap-2 items-center">
        {/* State Filter */}
        <Select value={stateFilter} onValueChange={onStateChange}>
          <SelectTrigger className="flex-1 h-9 bg-input text-sm">
            <SelectValue placeholder="All States" />
          </SelectTrigger>
          <SelectContent className="bg-background border border-border z-50 max-h-60">
            <SelectItem value="all">All States</SelectItem>
            {NIGERIAN_STATES.map((state) => (
              <SelectItem key={state} value={state}>
                {state}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{sortLabels[sortBy]}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => onSortChange(v as SortOption)}>
              <DropdownMenuRadioItem value="relevance">Relevance</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="rating">Highest Rated</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="experience">Most Experience</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="recent">Recently Active</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Advanced Filters */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 relative">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Filters</span>
              {activeFiltersCount > 0 && (
                <Badge className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Advanced Filters</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="p-2 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => onVerifiedChange(e.target.checked)}
                  className="rounded border-border"
                />
                <span className="text-sm">Verified experts only</span>
              </label>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default ExpertFilters;
