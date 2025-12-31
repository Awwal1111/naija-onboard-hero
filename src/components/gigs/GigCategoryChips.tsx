import React from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { GIG_CATEGORIES, GIG_CATEGORY_LIST, GigCategory } from '@/lib/gigCategories';

interface GigCategoryChipsProps {
  selected: string;
  onSelect: (category: string) => void;
  gigCounts?: Record<string, number>;
  showAll?: boolean;
}

export const GigCategoryChips: React.FC<GigCategoryChipsProps> = ({ 
  selected, 
  onSelect,
  gigCounts = {},
  showAll = true,
}) => {
  const categories = showAll ? ['all', ...GIG_CATEGORY_LIST] : GIG_CATEGORY_LIST;

  return (
    <div className="mb-4 -mx-6">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2 px-6 py-1">
          {categories.map((category) => {
            const isAll = category === 'all';
            const isSelected = selected === category || (selected === 'all' && isAll) || (!selected && isAll);
            const config = isAll ? null : GIG_CATEGORIES[category as GigCategory];
            const count = isAll 
              ? Object.values(gigCounts).reduce((a, b) => a + b, 0)
              : gigCounts[category] || 0;
            
            return (
              <button
                key={category}
                onClick={() => onSelect(category)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                  "border border-border hover:border-primary/50",
                  isSelected 
                    ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                    : "bg-card hover:bg-accent"
                )}
              >
                <span>{isAll ? '✨' : config?.icon}</span>
                <span>{isAll ? 'All' : category}</span>
                {count > 0 && (
                  <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full",
                    isSelected ? "bg-primary-foreground/20" : "bg-muted"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  );
};

export default GigCategoryChips;
