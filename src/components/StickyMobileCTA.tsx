import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { BrandButton } from '@/components/ui/brand-button'

export const StickyMobileCTA = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border p-3 flex gap-2 md:hidden shadow-[0_-4px_20px_-4px_hsl(var(--primary)/0.15)]">
      <BrandButton asChild className="flex-1 py-5 text-sm font-semibold">
        <Link to="/signup?intent=hire">
          Hire Talent
        </Link>
      </BrandButton>
      <BrandButton asChild variant="outline" className="flex-1 py-5 text-sm font-semibold border-2">
        <Link to="/signup?intent=earn">
          Start Earning
          <ArrowRight className="ml-1.5 w-4 h-4" />
        </Link>
      </BrandButton>
    </div>
  )
}
