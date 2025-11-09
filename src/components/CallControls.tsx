import React from 'react'
import { Button } from '@/components/ui/button'
import { Phone, Video } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface CallControlsProps {
  onStartVoiceCall: () => void
  onStartVideoCall: () => void
}

const CallControls: React.FC<CallControlsProps> = ({
  onStartVoiceCall,
  onStartVideoCall
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Phone className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onStartVoiceCall}>
          <Phone className="mr-2 h-4 w-4" />
          Voice Call
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onStartVideoCall}>
          <Video className="mr-2 h-4 w-4" />
          Video Call
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default CallControls
