import { useNavigate } from 'react-router-dom'
import { Bot, ChevronRight } from 'lucide-react'

// Prominent entry point to the AI freelancer finder (/ai-hire) at the top of the feed.
// It used to be reachable only through the "More" drawer and the search suggestions.
export const AIHireBanner = () => {
  const navigate = useNavigate()
  return (
    <div className="px-4 pt-3">
      <button
        type="button"
        onClick={() => navigate('/ai-hire')}
        className="w-full flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 p-3 text-left transition hover:bg-primary/15 active:scale-[0.99]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Bot className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Find a freelancer with AI</span>
          <span className="block text-xs text-muted-foreground truncate">
            Describe the work and get matched with skilled people
          </span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
      </button>
    </div>
  )
}

export default AIHireBanner
