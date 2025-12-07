import React, { useState } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize2 } from 'lucide-react'
import ImageViewer from './ImageViewer'

interface MediaGalleryProps {
  media: string[]
}

const MediaGallery: React.FC<MediaGalleryProps> = ({ media }) => {
  const [viewerOpen, setViewerOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [videoStates, setVideoStates] = useState<Record<number, { playing: boolean; muted: boolean }>>({})

  const openViewer = (index: number) => {
    setCurrentIndex(index)
    setViewerOpen(true)
  }

  const isVideo = (url: string) => {
    return url.includes('.mp4') || url.includes('.mov') || url.includes('.avi') || url.includes('.webm') || url.includes('video')
  }

  const togglePlay = (index: number, videoEl: HTMLVideoElement) => {
    if (videoEl.paused) {
      videoEl.play()
      setVideoStates(prev => ({ ...prev, [index]: { ...prev[index], playing: true } }))
    } else {
      videoEl.pause()
      setVideoStates(prev => ({ ...prev, [index]: { ...prev[index], playing: false } }))
    }
  }

  const toggleMute = (index: number, videoEl: HTMLVideoElement) => {
    videoEl.muted = !videoEl.muted
    setVideoStates(prev => ({ ...prev, [index]: { ...prev[index], muted: videoEl.muted } }))
  }

  if (media.length === 0) return null

  // Single media - full width, clean display
  if (media.length === 1) {
    const url = media[0]
    return (
      <div className="relative bg-muted/30">
        {isVideo(url) ? (
          <div className="relative group">
            <video
              id="video-0"
              src={url}
              className="w-full max-h-[500px] object-contain bg-black"
              controls
              playsInline
              preload="metadata"
              poster={`${url}#t=0.1`}
            />
          </div>
        ) : (
          <div 
            className="cursor-pointer"
            onClick={() => openViewer(0)}
          >
            <img
              src={url}
              alt="Post media"
              className="w-full max-h-[500px] object-contain"
              loading="lazy"
            />
          </div>
        )}
        
        <ImageViewer
          images={media.filter(url => !isVideo(url))}
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          initialIndex={0}
        />
      </div>
    )
  }

  // Two media - side by side, equal height
  if (media.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-0.5 bg-muted/30">
        {media.map((url, index) => (
          <div 
            key={index}
            className="relative aspect-square overflow-hidden"
          >
            {isVideo(url) ? (
              <div className="relative w-full h-full group">
                <video
                  id={`video-${index}`}
                  src={url}
                  className="w-full h-full object-cover bg-black"
                  playsInline
                  muted
                  loop
                  preload="metadata"
                  onClick={(e) => {
                    const video = e.currentTarget
                    togglePlay(index, video)
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {!videoStates[index]?.playing && (
                    <div className="bg-black/60 rounded-full p-4">
                      <Play className="h-8 w-8 text-white fill-white" />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <img
                src={url}
                alt={`Post media ${index + 1}`}
                className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                loading="lazy"
                onClick={() => openViewer(index)}
              />
            )}
          </div>
        ))}
        
        <ImageViewer
          images={media.filter(url => !isVideo(url))}
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          initialIndex={currentIndex}
        />
      </div>
    )
  }

  // 3 media - 1 large + 2 small
  if (media.length === 3) {
    return (
      <div className="grid grid-cols-2 gap-0.5 bg-muted/30">
        <div className="row-span-2 relative aspect-[3/4] overflow-hidden">
          {isVideo(media[0]) ? (
            <video
              src={media[0]}
              className="w-full h-full object-cover bg-black"
              controls
              playsInline
              preload="metadata"
            />
          ) : (
            <img
              src={media[0]}
              alt="Post media 1"
              className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
              loading="lazy"
              onClick={() => openViewer(0)}
            />
          )}
        </div>
        {media.slice(1).map((url, index) => (
          <div key={index + 1} className="relative aspect-square overflow-hidden">
            {isVideo(url) ? (
              <div className="relative w-full h-full group">
                <video
                  src={url}
                  className="w-full h-full object-cover bg-black"
                  playsInline
                  muted
                  preload="metadata"
                  onClick={(e) => togglePlay(index + 1, e.currentTarget)}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {!videoStates[index + 1]?.playing && (
                    <div className="bg-black/60 rounded-full p-3">
                      <Play className="h-6 w-6 text-white fill-white" />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <img
                src={url}
                alt={`Post media ${index + 2}`}
                className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                loading="lazy"
                onClick={() => openViewer(index + 1)}
              />
            )}
          </div>
        ))}
        
        <ImageViewer
          images={media.filter(url => !isVideo(url))}
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          initialIndex={currentIndex}
        />
      </div>
    )
  }

  // 4+ media - 2x2 grid with overflow indicator
  return (
    <div className="grid grid-cols-2 gap-0.5 bg-muted/30">
      {media.slice(0, 4).map((url, index) => (
        <div 
          key={index}
          className="relative aspect-square overflow-hidden"
        >
          {isVideo(url) ? (
            <div className="relative w-full h-full group">
              <video
                src={url}
                className="w-full h-full object-cover bg-black"
                playsInline
                muted
                preload="metadata"
                onClick={(e) => togglePlay(index, e.currentTarget)}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {!videoStates[index]?.playing && (
                  <div className="bg-black/60 rounded-full p-3">
                    <Play className="h-6 w-6 text-white fill-white" />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <img
                src={url}
                alt={`Post media ${index + 1}`}
                className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                loading="lazy"
                onClick={() => openViewer(index)}
              />
              {/* Show +N overlay on last image if more than 4 */}
              {index === 3 && media.length > 4 && (
                <div 
                  className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer"
                  onClick={() => openViewer(3)}
                >
                  <span className="text-white text-2xl font-bold">
                    +{media.length - 4}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      ))}
      
      <ImageViewer
        images={media.filter(url => !isVideo(url))}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        initialIndex={currentIndex}
      />
    </div>
  )
}

export default MediaGallery