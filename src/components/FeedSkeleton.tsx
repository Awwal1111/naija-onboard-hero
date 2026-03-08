import { Skeleton } from '@/components/ui/skeleton'

/** Skeleton card mimicking a LinkedInPostCard for perceived performance */
const PostCardSkeleton = () => (
  <div className="bg-card p-4 border-b border-border/50 animate-in fade-in duration-300">
    {/* Author row */}
    <div className="flex items-center gap-3 mb-4">
      <Skeleton className="h-11 w-11 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-6 w-6 rounded" />
    </div>
    {/* Content lines */}
    <div className="space-y-2 mb-4">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-[85%]" />
      <Skeleton className="h-4 w-[60%]" />
    </div>
    {/* Media placeholder */}
    <Skeleton className="h-48 w-full rounded-lg mb-4" />
    {/* Action bar */}
    <div className="flex items-center gap-6 pt-2 border-t border-border/30">
      <Skeleton className="h-8 w-16 rounded" />
      <Skeleton className="h-8 w-16 rounded" />
      <Skeleton className="h-8 w-16 rounded" />
      <div className="flex-1" />
      <Skeleton className="h-8 w-8 rounded" />
    </div>
  </div>
)

/** Skeleton row mimicking the stories carousel */
const StoriesSkeleton = () => (
  <div className="px-4 py-3 flex gap-3 overflow-hidden">
    {/* Create story */}
    <div className="flex flex-col items-center gap-1.5">
      <Skeleton className="h-16 w-16 rounded-full" />
      <Skeleton className="h-3 w-12" />
    </div>
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex flex-col items-center gap-1.5">
        <Skeleton className="h-16 w-16 rounded-full" />
        <Skeleton className="h-3 w-10" />
      </div>
    ))}
  </div>
)

/** Full feed skeleton — stories + 3 post cards */
export const FeedSkeleton = () => (
  <div className="min-h-screen bg-background pb-20 pt-12">
    <div className="max-w-4xl mx-auto w-full">
      {/* Header skeleton */}
      <div className="bg-background border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-9 w-48 rounded-full hidden sm:block" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
      </div>

      {/* Stories skeleton */}
      <StoriesSkeleton />

      {/* Create post bar skeleton */}
      <div className="bg-card p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 flex-1 rounded-full" />
          <Skeleton className="h-10 w-10 rounded" />
        </div>
      </div>

      {/* Feed toggle skeleton */}
      <div className="bg-card border-b border-border px-4 py-3 flex gap-4">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-20" />
      </div>

      {/* Post cards */}
      <PostCardSkeleton />
      <PostCardSkeleton />
      <PostCardSkeleton />
    </div>
  </div>
)

export default FeedSkeleton
