import { Badge } from '@/components/ui/badge';
import { Award, Trophy, Star, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  level?: string | null;
  size?: 'sm' | 'md';
  className?: string;
}

const LEVEL_META: Record<string, { label: string; icon: any; cls: string }> = {
  new:        { label: 'New',        icon: Sparkles, cls: 'bg-slate-100 text-slate-700 border-slate-300' },
  level_1:    { label: 'Level 1',    icon: Star,     cls: 'bg-blue-100 text-blue-700 border-blue-300' },
  level_2:    { label: 'Level 2',    icon: Award,    cls: 'bg-purple-100 text-purple-700 border-purple-300' },
  top_rated:  { label: 'Top Rated',  icon: Trophy,   cls: 'bg-gradient-to-r from-amber-200 to-yellow-300 text-amber-900 border-amber-400' },
};

export function ExpertLevelBadge({ level, size = 'sm', className }: Props) {
  const meta = LEVEL_META[level || 'new'] || LEVEL_META.new;
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className={cn(meta.cls, size === 'sm' ? 'text-[10px] h-5 px-1.5' : 'text-xs h-6 px-2', 'gap-1 font-medium', className)}>
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      {meta.label}
    </Badge>
  );
}
