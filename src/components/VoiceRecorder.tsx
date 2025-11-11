import React, { useState, useRef, useEffect } from 'react'
import { Mic, X, Lock } from 'lucide-react'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'

interface VoiceRecorderProps {
  onSendVoiceMessage: (audioBlob: Blob, duration: number) => Promise<void>
  onCancel: () => void
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSendVoiceMessage, onCancel }) => {
  const {
    isRecording,
    recordingDuration,
    audioBlob,
    startRecording,
    stopRecording,
    cancelRecording,
    formatDuration
  } = useVoiceRecorder()

  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [currentTouch, setCurrentTouch] = useState<{ x: number; y: number } | null>(null)
  const [isLocked, setIsLocked] = useState(false)
  const [isCancelled, setIsCancelled] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleTouchStart = async (e: React.TouchEvent) => {
    e.preventDefault()
    const touch = e.touches[0]
    setTouchStart({ x: touch.clientX, y: touch.clientY })
    setCurrentTouch({ x: touch.clientX, y: touch.clientY })
    setIsLocked(false)
    setIsCancelled(false)
    await startRecording()
  }

  const handleMouseDown = async (e: React.MouseEvent) => {
    e.preventDefault()
    setTouchStart({ x: e.clientX, y: e.clientY })
    setCurrentTouch({ x: e.clientX, y: e.clientY })
    setIsLocked(false)
    setIsCancelled(false)
    await startRecording()
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart || !isRecording) return
    
    const touch = e.touches[0]
    setCurrentTouch({ x: touch.clientX, y: touch.clientY })

    const deltaX = touchStart.x - touch.clientX
    const deltaY = touchStart.y - touch.clientY

    // Slide up to lock (threshold: 100px up)
    if (deltaY > 100 && !isLocked) {
      setIsLocked(true)
    }

    // Slide left to cancel (threshold: 100px left)
    if (deltaX > 100 && !isLocked && !isCancelled) {
      setIsCancelled(true)
      cancelRecording()
      onCancel()
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!touchStart || !isRecording) return
    
    setCurrentTouch({ x: e.clientX, y: e.clientY })

    const deltaX = touchStart.x - e.clientX
    const deltaY = touchStart.y - e.clientY

    // Slide up to lock (threshold: 100px up)
    if (deltaY > 100 && !isLocked) {
      setIsLocked(true)
    }

    // Slide left to cancel (threshold: 100px left)
    if (deltaX > 100 && !isLocked && !isCancelled) {
      setIsCancelled(true)
      cancelRecording()
      onCancel()
    }
  }

  const handleTouchEnd = async () => {
    if (!isRecording || isCancelled) return

    if (isLocked) {
      // Recording is locked, don't stop
      return
    }

    // Release to send
    stopRecording()
    
    // Wait a bit for audioBlob to be ready
    setTimeout(async () => {
      if (audioBlob) {
        await onSendVoiceMessage(audioBlob, recordingDuration)
        onCancel()
      }
    }, 100)
  }

  const handleMouseUp = async () => {
    if (!isRecording || isCancelled) return

    if (isLocked) {
      // Recording is locked, don't stop
      return
    }

    // Release to send
    stopRecording()
    
    // Wait a bit for audioBlob to be ready
    setTimeout(async () => {
      if (audioBlob) {
        await onSendVoiceMessage(audioBlob, recordingDuration)
        onCancel()
      }
    }, 100)
  }

  const handleLockedSend = async () => {
    stopRecording()
    setTimeout(async () => {
      if (audioBlob) {
        await onSendVoiceMessage(audioBlob, recordingDuration)
        onCancel()
      }
    }, 100)
  }

  const handleLockedCancel = () => {
    cancelRecording()
    setIsLocked(false)
    onCancel()
  }

  useEffect(() => {
    if (isRecording) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isRecording, touchStart, isLocked, isCancelled, audioBlob])

  if (!isRecording) return null

  const slideDistance = touchStart && currentTouch 
    ? Math.abs(touchStart.x - currentTouch.x)
    : 0

  const slideUpDistance = touchStart && currentTouch 
    ? touchStart.y - currentTouch.y
    : 0

  return (
    <div className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center">
      {!isLocked ? (
        <div className="flex flex-col items-center gap-8">
          {/* Slide up indicator */}
          <div className={`flex flex-col items-center transition-opacity ${slideUpDistance > 50 ? 'opacity-100' : 'opacity-40'}`}>
            <Lock className={`h-6 w-6 mb-2 ${slideUpDistance > 100 ? 'text-green-500' : 'text-muted-foreground'}`} />
            <span className="text-xs text-muted-foreground">Slide up to lock</span>
          </div>

          {/* Recording indicator */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
              <span className="text-2xl font-mono font-bold">
                {formatDuration(recordingDuration)}
              </span>
            </div>
            <span className="text-sm text-muted-foreground">Recording...</span>
          </div>

          {/* Mic button */}
          <button
            ref={buttonRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            <Mic className="h-8 w-8 text-white" />
          </button>

          {/* Slide to cancel indicator */}
          <div className={`flex items-center gap-2 transition-opacity ${slideDistance > 20 ? 'opacity-100' : 'opacity-40'}`}>
            <span className="text-sm text-muted-foreground">
              ← Slide to cancel
            </span>
            <div 
              className="h-1 bg-destructive rounded-full transition-all"
              style={{ width: `${Math.min(slideDistance, 100)}px` }}
            />
          </div>
        </div>
      ) : (
        <div className="bg-card p-6 rounded-lg shadow-lg max-w-sm w-full mx-4">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
              <span className="text-sm font-medium">Recording locked</span>
            </div>
            
            <div className="text-3xl font-mono font-bold">
              {formatDuration(recordingDuration)}
            </div>

            <div className="flex gap-3 mt-4 w-full">
              <button
                onClick={handleLockedCancel}
                className="flex-1 py-3 px-4 bg-muted hover:bg-muted/80 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <X className="h-5 w-5" />
                <span className="text-sm font-medium">Cancel</span>
              </button>
              
              <button
                onClick={handleLockedSend}
                className="flex-1 py-3 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Mic className="h-5 w-5" />
                <span className="text-sm font-medium">Send</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default VoiceRecorder
