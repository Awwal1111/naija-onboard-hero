import { useEffect, useRef } from 'react'

const TopBannerAd = () => {
  const adContainerRef = useRef<HTMLDivElement>(null)
  const scriptLoadedRef = useRef(false)

  useEffect(() => {
    // Only load the script once
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
        console.error('Error loading ad script:', error)
      }
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(loadAdScript, 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div 
      id="small-ad-banner" 
      className="w-full h-[60px] overflow-hidden flex justify-center items-center bg-muted/30 border-b border-border"
    >
      <div ref={adContainerRef} className="w-full h-full">
        <div id="container-6b822cbe4be5b41c48d271c1d94043a6" className="w-full h-full" />
      </div>
    </div>
  )
}

export default TopBannerAd
