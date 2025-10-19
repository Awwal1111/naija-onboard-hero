import { useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'

interface InFeedAdProps {
  index: number
}

const InFeedAd = ({ index }: InFeedAdProps) => {
  const adContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load AdMob native ad
    const loadAdMobAd = () => {
      try {
        // AdMob Native Advanced Ad Integration
        const adContainer = adContainerRef.current
        if (!adContainer) return

        // Create AdMob ad placeholder
        const adElement = document.createElement('div')
        adElement.className = 'admob-native-ad'
        adElement.innerHTML = `
          <div class="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 space-y-2">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded">
                Sponsored • AdMob
              </span>
            </div>
            <div class="text-xs text-muted-foreground space-y-1">
              <p class="font-medium">AdMob Native Ad Slot</p>
              <p class="text-[10px]">App ID: ca-app-pub-8391637296552757~8383341687</p>
              <p class="text-[10px]">Ad Unit: ca-app-pub-8391637296552757/8373089313</p>
              <p class="text-[10px] italic mt-2">Integration with Google Mobile Ads SDK required</p>
            </div>
          </div>
        `
        
        adContainer.appendChild(adElement)
      } catch (error) {
        console.error('Error loading AdMob native ad:', error)
      }
    }

    const timer = setTimeout(loadAdMobAd, 100)
    return () => clearTimeout(timer)
  }, [index])

  return (
    <Card className="sponsored-feed-item bg-muted/20 border-muted mb-6">
      <CardContent className="pt-4">
        <div 
          ref={adContainerRef}
          className="w-full min-h-[120px] flex justify-center items-center"
        />
      </CardContent>
    </Card>
  )
}

export default InFeedAd
