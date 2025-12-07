import React, { useState } from 'react'
import { Play, ImageOff } from 'lucide-react'
import ImageViewer from './ImageViewer'

interface MediaGalleryProps {
  media: string[]
}

const MediaGallery: React.FC<MediaGalleryProps> = ({ media }) => {
  const [viewerOpen, setViewerOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [videoStates, setVideoStates] = useState<Record<number, { playing: boolean }>>({})
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set())

  const openViewer = (index: number) => {
    setCurrentIndex(index)
    setViewerOpen(true)
  }

  const isVideo = (url: string) => {
    return url.includes('.mp4') || url.includes('.mov') || url.includes('.avi') || url.includes('.webm') || url.includes('video')
  }

  const isValidUrl = (url: string) => {
    try {
      return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')
    } catch {
      return false
    }
  }

  const togglePlay = (index: number, videoEl: HTMLVideoElement) => {
    if (videoEl.paused) {
      videoEl.play()
      setVideoStates(prev => ({ ...prev, [index]: { playing: true } }))
    } else {
      videoEl.pause()
      setVideoStates(prev => ({ ...prev, [index]: { playing: false } }))
    }
  }

  const handleImageError = (index: number) => {
    setFailedImages(prev => new Set(prev).add(index))
  }

  // Filter to only valid URLs
  const validMedia = media.filter(url => isValidUrl(url))

  if (validMedia.length === 0) return null

  // Single media
  if (validMedia.length === 1) {
    const url = validMedia[0]
    return (
      <div className="relative bg-muted/30">
        {isVideo(url) ? (
          <video
            src={url}
            className="w-full max-h-[500px] object-contain bg-black"
            controls
            playsInline
            preload="metadata"
          />
        ) : failedImages.has(0) ? (
          <div className="w-full h-48 bg-muted flex items-center justify-center">
            <ImageOff className="h-8 w-8 text-muted-foreground" />
          </div>
        ) : (
          <div className="cursor-pointer" onClick={() => openViewer(0)}>
            <img
              src={url}
              alt="Post media"
              className="w-full max-h-[500px] object-contain"
              loading="lazy"
              onError={() => handleImageError(0)}
            />
          </div>
        )}
        
        <ImageViewer
          images={validMedia.filter(u => !isVideo(u))}
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          initialIndex={0}
        />
      </div>
    )
  }

  // Two media
  if (validMedia.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-0.5 bg-muted/30">
        {validMedia.map((url, index) => (
          <div key={index} className="relative aspect-square overflow-hidden">
            {isVideo(url) ? (
              <div className="relative w-full h-full">
                <video
                  src={url}
                  className="w-full h-full object-cover bg-black"
                  playsInline
                  muted
                  loop
                  preload="metadata"
                  onClick={(e) => togglePlay(index, e.currentTarget)}
                />
                {!videoStates[index]?.playing && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-black/60 rounded-full p-4">
                      <Play className="h-8 w-8 text-white fill-white" />
                    </div>
                  </div>
                )}
              </div>
            ) : failedImages.has(index) ? (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <ImageOff className="h-6 w-6 text-muted-foreground" />
              </div>
            ) : (
              <img
                src={url}
                alt={`Media ${index + 1}`}
                className="w-full h-full object-cover cursor-pointer"
                loading="lazy"
                onClick={() => openViewer(index)}
                onError={() => handleImageError(index)}
              />
            )}
          </div>
        ))}
        
        <ImageViewer
          images={validMedia.filter(u => !isVideo(u))}
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          initialIndex={currentIndex}
        />
      </div>
    )
  }

  // 3 media
  if (validMedia.length === 3) {
    return (
      <div className="grid grid-cols-2 gap-0.5 bg-muted/30">
        <div className="row-span-2 relative aspect-[3/4] overflow-hidden">
          {isVideo(validMedia[0]) ? (
            <video
              src={validMedia[0]}
              className="w-full h-full object-cover bg-black"
              controls
              playsInline
              preload="metadata"
            />
          ) : failedImages.has(0) ? (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <ImageOff className="h-8 w-8 text-muted-foreground" />
            </div>
          ) : (
            <img
              src={validMedia[0]}
              alt="Media 1"
              className="w-full h-full object-cover cursor-pointer"
              loading="lazy"
              onClick={() => openViewer(0)}
              onError={() => handleImageError(0)}
            />
          )}
        </div>
        {validMedia.slice(1).map((url, idx) => (
          <div key={idx + 1} className="relative aspect-square overflow-hidden">
            {isVideo(url) ? (
              <div className="relative w-full h-full">
                <video
                  src={url}
                  className="w-full h-full object-cover bg-black"
                  playsInline
                  muted
                  preload="metadata"
                  onClick={(e) => togglePlay(idx + 1, e.currentTarget)}
                />
                {!videoStates[idx + 1]?.playing && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-black/60 rounded-full p-3">
                      <Play className="h-6 w-6 text-white fill-white" />
                    </div>
                  </div>
                )}
              </div>
            ) : failedImages.has(idx + 1) ? (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <ImageOff className="h-6 w-6 text-muted-foreground" />
              </div>
            ) : (
              <img
                src={url}
                alt={`Media ${idx + 2}`}
                className="w-full h-full object-cover cursor-pointer"
                loading="lazy"
                onClick={() => openViewer(idx + 1)}
                onError={() => handleImageError(idx + 1)}
              />
            )}
          </div>
        ))}
        
        <ImageViewer
          images={validMedia.filter(u => !isVideo(u))}
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          initialIndex={currentIndex}
        />
      </div>
    )
  }

  // 4+ media - 2x2 grid
  return (
    <div className="grid grid-cols-2 gap-0.5 bg-muted/30">
      {validMedia.slice(0, 4).map((url, index) => (
        <div key={index} className="relative aspect-square overflow-hidden">
          {isVideo(url) ? (
            <div className="relative w-full h-full">
              <video
                src={url}
                className="w-full h-full object-cover bg-black"
                playsInline
                muted
                preload="metadata"
                onClick={(e) => togglePlay(index, e.currentTarget)}
              />
              {!videoStates[index]?.playing && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-black/60 rounded-full p-3">
                    <Play className="h-6 w-6 text-white fill-white" />
                  </div>
                </div>
              )}
            </div>
          ) : failedImages.has(index) ? (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <ImageOff className="h-6 w-6 text-muted-foreground" />
            </div>
          ) : (
            <>
              <img
                src={url}
                alt={`Media ${index + 1}`}
                className="w-full h-full object-cover cursor-pointer"
                loading="lazy"
                onClick={() => openViewer(index)}
                onError={() => handleImageError(index)}
              />
              {index === 3 && validMedia.length > 4 && (
                <div 
                  className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer"
                  onClick={() => openViewer(3)}
                >
                  <span className="text-white text-2xl font-bold">+{validMedia.length - 4}</span>
                </div>
              )}
            </>
          )}
        </div>
      ))}
      
      <ImageViewer
        images={validMedia.filter(u => !isVideo(u))}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        initialIndex={currentIndex}
      />
    </div>
  )
}

export default MediaGallery