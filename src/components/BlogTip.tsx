import { Link } from 'react-router-dom';
import { BookOpen, ArrowRight } from 'lucide-react';

interface BlogTipProps {
  slug: string;
  title: string;
  subtitle?: string;
}

/**
 * Small contextual card that links to a relevant blog post.
 * Used inline on posting/application pages to guide users.
 */
export function BlogTip({ slug, title, subtitle }: BlogTipProps) {
  return (
    <Link
      to={`/blog/${slug}`}
      className="block rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors p-3 sm:p-4 no-underline"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
          <BookOpen className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-primary mb-0.5">Read before you continue</div>
          <div className="text-sm font-semibold text-text-primary line-clamp-2">{title}</div>
          {subtitle && (
            <div className="text-xs text-text-secondary mt-0.5 line-clamp-2">{subtitle}</div>
          )}
        </div>
        <ArrowRight className="h-4 w-4 text-primary flex-shrink-0 mt-1" />
      </div>
    </Link>
  );
}

export default BlogTip;
