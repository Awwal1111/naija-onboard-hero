import { useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'

interface InFeedAdProps {
  index: number
}

const InFeedAd = ({ index }: InFeedAdProps) => {
  const adContainerRef = useRef<HTMLDivElement>(null)
  const scriptLoadedRef = useRef(false)

  useEffect(() => {
    // Only load the script once per ad instance
    if (scriptLoadedRef.current) return
    
    const loadAdScript = () => {
      try {
        const script = document.createElement('script')
        script.async = true
        script.setAttribute('data-cfasync', 'false')
        script.src = '//pl27766561.revenuecpmgate.com/6b822cbe4be5b41c48d271c1d94043a6/invoke.js'
        
        if (adContainerRef.current) {
          adContainerRef.current.appendChild(script)
          scriptLoadedRef.current = true
        }
      } catch (error) {
        console.error('Error loading in-feed ad script:', error)
      }
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(loadAdScript, 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <Card className="sponsored-feed-item bg-muted/20 border-muted mb-6">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wider px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded">
            Sponsored
          </span>
        </div>
        <div 
          ref={adContainerRef}
          className="w-full min-h-[60px] flex justify-center items-center"
        >
          <div 
            id={`container-6b822cbe4be5b41c48d271c1d94043a6-${index}`} 
            className="w-full h-[60px]"
          />
        </div>
      </CardContent>
    </Card>
  )
}

export default InFeedAd
