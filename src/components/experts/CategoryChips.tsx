import React, { useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const EXPERT_CATEGORIES = [
  { id: 'all', label: 'All', icon: '✨' },
  { id: 'Web Development', label: 'Web Dev', icon: '💻' },
  { id: 'Mobile App Development', label: 'Mobile', icon: '📱' },
  { id: 'UI/UX Design', label: 'UI/UX', icon: '🎨' },
  { id: 'Graphic Design', label: 'Graphics', icon: '🖼️' },
  { id: 'Digital Marketing', label: 'Marketing', icon: '📊' },
  { id: 'Content Writing', label: 'Writing', icon: '✍️' },
  { id: 'Video Editing', label: 'Video', icon: '🎬' },
  { id: 'Photography', label: 'Photo', icon: '📷' },
  { id: 'Data Analysis', label: 'Data', icon: '📈' },
  { id: 'Virtual Assistant', label: 'VA', icon: '🤝' },
  { id: 'Social Media Management', label: 'Social', icon: '📲' },
  { id: 'Accounting & Finance', label: 'Finance', icon: '💰' },
  { id: 'Legal Services', label: 'Legal', icon: '⚖️' },
  { id: 'Business Consulting', label: 'Consulting', icon: '💼' },
];

interface CategoryChipsProps {
  selected: string;
  onSelect: (category: string) => void;
  expertCounts?: Record<string, number>;
}

export const CategoryChips: React.FC<CategoryChipsProps> = ({ 
  selected, 
  onSelect,
  expertCounts = {}
}) => {
  return (
    <div className="mb-4 -mx-6">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2 px-6 py-1">
          {EXPERT_CATEGORIES.map((category) => {
            const isSelected = selected === category.id || (selected === 'all' && category.id === 'all');
            const count = category.id === 'all' 
              ? Object.values(expertCounts).reduce((a, b) => a + b, 0)
              : expertCounts[category.id] || 0;
            
            return (
              <button
                key={category.id}
                onClick={() => onSelect(category.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                  "border border-border hover:border-primary/50",
                  isSelected 
                    ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                    : "bg-card hover:bg-accent"
                )}
              >
                <span>{category.icon}</span>
                <span>{category.label}</span>
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

export default CategoryChips;
