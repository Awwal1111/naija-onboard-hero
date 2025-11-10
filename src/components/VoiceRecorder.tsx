import React from 'react'
import { Mic, Square, Pause, Play, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'

interface VoiceRecorderProps {
  onSendVoiceMessage: (audioBlob: Blob, duration: number) => Promise<void>
  onCancel: () => void
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSendVoiceMessage, onCancel }) => {
  const {
    isRecording,
    isPaused,
    recordingDuration,
    audioUrl,
    audioBlob,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
    formatDuration
  } = useVoiceRecorder()

  const handleSend = async () => {
    if (audioBlob) {
      await onSendVoiceMessage(audioBlob, recordingDuration)
      onCancel()
    }
  }

  const handleCancel = () => {
    cancelRecording()
    onCancel()
  }

  // If not recording and no audio recorded, show start button
  if (!isRecording && !audioUrl) {
    return (
      <div className="flex items-center gap-2 p-2">
        <Button
          onClick={startRecording}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Mic className="h-4 w-4 text-destructive" />
          Record Voice Message
        </Button>
        <Button
          onClick={onCancel}
          variant="ghost"
          size="sm"
        >
          Cancel
        </Button>
      </div>
    )
  }

  // Recording in progress
  if (isRecording) {
    return (
      <Card className="p-4 mb-2 bg-accent/50">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-3 h-3 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-destructive animate-pulse'}`} />
              <span className="text-sm font-medium">
                {isPaused ? 'Paused' : 'Recording...'}
              </span>
            </div>
            <div className="text-2xl font-mono">
              {formatDuration(recordingDuration)}
            </div>
          </div>
          
          <div className="flex gap-2">
            {isPaused ? (
              <Button
                onClick={resumeRecording}
                variant="outline"
                size="icon"
              >
                <Play className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={pauseRecording}
                variant="outline"
                size="icon"
              >
                <Pause className="h-4 w-4" />
              </Button>
            )}
            
            <Button
              onClick={stopRecording}
              variant="default"
              size="icon"
            >
              <Square className="h-4 w-4" />
            </Button>
            
            <Button
              onClick={handleCancel}
              variant="ghost"
              size="icon"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  // Audio recorded, ready to send
  if (audioUrl && audioBlob) {
    return (
      <Card className="p-4 mb-2 bg-accent/50">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="text-sm text-muted-foreground mb-2">Voice Message</div>
            <audio src={audioUrl} controls className="w-full max-w-xs" />
            <div className="text-xs text-muted-foreground mt-1">
              Duration: {formatDuration(recordingDuration)}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={handleSend}
              variant="default"
              size="icon"
              className="bg-primary"
            >
              <Send className="h-4 w-4" />
            </Button>
            
            <Button
              onClick={handleCancel}
              variant="ghost"
              size="icon"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  return null
}

export default VoiceRecorder
