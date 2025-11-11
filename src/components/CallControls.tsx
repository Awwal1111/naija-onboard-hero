import React from 'react'
import { Phone, Video } from 'lucide-react'

interface CallControlsProps {
  onStartVoiceCall: () => void
  onStartVideoCall: () => void
}

const CallControls: React.FC<CallControlsProps> = ({
  onStartVoiceCall,
  onStartVideoCall
}) => {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onStartVoiceCall}
        className="p-2 hover:bg-green-500/10 rounded-full transition-colors group"
        title="Start voice call"
      >
        <Phone className="h-5 w-5 text-green-600 group-hover:text-green-700" />
      </button>
      <button
        onClick={onStartVideoCall}
        className="p-2 hover:bg-blue-500/10 rounded-full transition-colors group"
        title="Start video call"
      >
        <Video className="h-5 w-5 text-blue-600 group-hover:text-blue-700" />
      </button>
    </div>
  )
}

export default CallControls
