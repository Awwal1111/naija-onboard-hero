import { useState, useRef, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'

interface VoiceRecorderState {
  isRecording: boolean
  isPaused: boolean
  recordingDuration: number
  audioUrl: string | null
  audioBlob: Blob | null
}

export const useVoiceRecorder = () => {
  const { toast } = useToast()
  const [state, setState] = useState<VoiceRecorderState>({
    isRecording: false,
    isPaused: false,
    recordingDuration: 0,
    audioUrl: null,
    audioBlob: null
  })

  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const mediaStream = useRef<MediaStream | null>(null)
  const chunks = useRef<Blob[]>([])
  const startTime = useRef<number>(0)
  const timerInterval = useRef<NodeJS.Timeout | null>(null)

  const startRecording = useCallback(async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })
      
      mediaStream.current = stream
      
      // Create MediaRecorder with preferred format
      const options = { mimeType: 'audio/webm;codecs=opus' }
      mediaRecorder.current = new MediaRecorder(stream, options)
      
      chunks.current = []
      
      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.current.push(e.data)
        }
      }
      
      mediaRecorder.current.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        
        setState(prev => ({
          ...prev,
          isRecording: false,
          isPaused: false,
          audioUrl: url,
          audioBlob: blob
        }))
        
        // Stop all tracks
        if (mediaStream.current) {
          mediaStream.current.getTracks().forEach(track => track.stop())
        }
        
        if (timerInterval.current) {
          clearInterval(timerInterval.current)
        }
      }
      
      // Start recording
      mediaRecorder.current.start()
      startTime.current = Date.now()
      
      // Start duration timer
      timerInterval.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          recordingDuration: Math.floor((Date.now() - startTime.current) / 1000)
        }))
      }, 1000)
      
      setState(prev => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        recordingDuration: 0,
        audioUrl: null,
        audioBlob: null
      }))
      
    } catch (error: any) {
      console.error('Error starting recording:', error)
      toast({
        title: "Recording Failed",
        description: error.message || "Could not access microphone",
        variant: "destructive"
      })
    }
  }, [toast])

  const pauseRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.pause()
      if (timerInterval.current) {
        clearInterval(timerInterval.current)
      }
      setState(prev => ({ ...prev, isPaused: true }))
    }
  }, [])

  const resumeRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'paused') {
      mediaRecorder.current.resume()
      
      // Resume timer
      const pausedDuration = state.recordingDuration
      startTime.current = Date.now() - (pausedDuration * 1000)
      
      timerInterval.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          recordingDuration: Math.floor((Date.now() - startTime.current) / 1000)
        }))
      }, 1000)
      
      setState(prev => ({ ...prev, isPaused: false }))
    }
  }, [state.recordingDuration])

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && 
        (mediaRecorder.current.state === 'recording' || mediaRecorder.current.state === 'paused')) {
      mediaRecorder.current.stop()
    }
  }, [])

  const cancelRecording = useCallback(() => {
    if (mediaRecorder.current) {
      mediaRecorder.current.stop()
    }
    
    if (mediaStream.current) {
      mediaStream.current.getTracks().forEach(track => track.stop())
    }
    
    if (timerInterval.current) {
      clearInterval(timerInterval.current)
    }
    
    chunks.current = []
    
    setState({
      isRecording: false,
      isPaused: false,
      recordingDuration: 0,
      audioUrl: null,
      audioBlob: null
    })
  }, [])

  const clearRecording = useCallback(() => {
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl)
    }
    
    setState({
      isRecording: false,
      isPaused: false,
      recordingDuration: 0,
      audioUrl: null,
      audioBlob: null
    })
  }, [state.audioUrl])

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return {
    ...state,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
    clearRecording,
    formatDuration
  }
}
