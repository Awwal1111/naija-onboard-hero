import { Bookmark, BookmarkCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBookmarks, BookmarkType } from '@/hooks/useBookmarks';
import { cn } from '@/lib/utils';

interface BookmarkButtonProps {
  type: BookmarkType;
  itemId: string;
  variant?: 'default' | 'icon' | 'outline';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export const BookmarkButton = ({
  type,
  itemId,
  variant = 'icon',
  size = 'sm',
  className
}: BookmarkButtonProps) => {
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const saved = isBookmarked(type, itemId);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toggleBookmark(type, itemId);
  };

  if (variant === 'default') {
    return (
      <Button
        variant={saved ? 'secondary' : 'outline'}
        size={size}
        onClick={handleClick}
        className={cn('gap-2', className)}
      >
        {saved ? (
          <>
            <BookmarkCheck className="h-4 w-4" />
            Saved
          </>
        ) : (
          <>
            <Bookmark className="h-4 w-4" />
            Save
          </>
        )}
      </Button>
    );
  }

  return (
    <Button
      variant={variant === 'outline' ? 'outline' : 'ghost'}
      size="icon"
      onClick={handleClick}
      className={cn(
        saved && 'text-primary',
        className
      )}
    >
      {saved ? (
        <BookmarkCheck className="h-5 w-5" />
      ) : (
        <Bookmark className="h-5 w-5" />
      )}
    </Button>
  );
};
