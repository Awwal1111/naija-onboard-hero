import React, { useState } from 'react'
import { Play, Image as ImageIcon } from 'lucide-react'
import ImageViewer from './ImageViewer'

interface MediaGalleryProps {
  media: string[]
}

const MediaGallery: React.FC<MediaGalleryProps> = ({ media }) => {
  const [viewerOpen, setViewerOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  const openViewer = (index: number) => {
    setCurrentIndex(index)
    setViewerOpen(true)
  }

  const isVideo = (url: string) => {
    return url.includes('.mp4') || url.includes('.mov') || url.includes('.avi') || url.includes('video')
  }

  if (media.length === 0) return null

  if (media.length === 1) {
    const url = media[0]
    return (
      <div className="mb-4">
        <div 
          className="relative cursor-pointer rounded-xl overflow-hidden group"
          onClick={() => !isVideo(url) && openViewer(0)}
        >
          {isVideo(url) ? (
            <video
              src={url}
              className="w-full max-h-96 object-cover"
              controls
              preload="metadata"
            />
          ) : (
            <>
              <img
                src={url}
                alt="Post media"
                className="w-full max-h-96 object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full p-3">
                  <ImageIcon className="h-6 w-6 text-white" />
                </div>
              </div>
            </>
          )}
        </div>
        
        <ImageViewer
          images={media.filter(url => !isVideo(url))}
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          initialIndex={0}
        />
      </div>
    )
  }

  if (media.length === 2) {
    return (
      <div className="mb-4 grid grid-cols-2 gap-2">
        {media.map((url, index) => (
          <div 
            key={index}
            className="relative cursor-pointer rounded-xl overflow-hidden group"
            onClick={() => !isVideo(url) && openViewer(index)}
          >
            {isVideo(url) ? (
              <div className="relative">
                <video
                  src={url}
                  className="w-full h-48 object-cover"
                  preload="metadata"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <Play className="h-12 w-12 text-white" />
                </div>
              </div>
            ) : (
              <>
                <img
                  src={url}
                  alt={`Post media ${index + 1}`}
                  className="w-full h-48 object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full p-2">
                    <ImageIcon className="h-4 w-4 text-white" />
                  </div>
                </div>
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

  // 3+ images - vertical scroll with main image
  const [mainImage, ...otherImages] = media
  
  return (
    <div className="mb-4 flex gap-2 max-h-96">
      <div 
        className="flex-1 relative cursor-pointer rounded-xl overflow-hidden group"
        onClick={() => !isVideo(mainImage) && openViewer(0)}
      >
        {isVideo(mainImage) ? (
          <video
            src={mainImage}
            className="w-full h-full object-cover"
            controls
            preload="metadata"
          />
        ) : (
          <>
            <img
              src={mainImage}
              alt="Main post media"
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full p-3">
                <ImageIcon className="h-6 w-6 text-white" />
              </div>
            </div>
          </>
        )}
      </div>
      
      <div className="w-24 flex flex-col gap-2 overflow-y-auto">
        {otherImages.map((url, index) => (
          <div 
            key={index + 1}
            className="relative cursor-pointer rounded-lg overflow-hidden group flex-shrink-0"
            onClick={() => !isVideo(url) && openViewer(index + 1)}
          >
            {isVideo(url) ? (
              <div className="relative">
                <video
                  src={url}
                  className="w-full h-20 object-cover"
                  preload="metadata"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <Play className="h-4 w-4 text-white" />
                </div>
              </div>
            ) : (
              <>
                <img
                  src={url}
                  alt={`Post media ${index + 2}`}
                  className="w-full h-20 object-cover transition-transform group-hover:scale-105"
                />
                {index === otherImages.length - 1 && otherImages.length > 3 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      +{otherImages.length - 3}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full p-1">
                    <ImageIcon className="h-3 w-3 text-white" />
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      
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