import React from 'react'
import { 
  HelpCircle, Video, Users, Calendar, Star, Clock, 
  Shield, Mic, Camera, Share2, MessageCircle, Hand
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

interface HelpSectionProps {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}

const HelpSection = ({ icon, title, children }: HelpSectionProps) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2 font-semibold text-foreground">
      {icon}
      <span>{title}</span>
    </div>
    <div className="text-sm text-muted-foreground pl-6 space-y-1">
      {children}
    </div>
  </div>
)

interface ExpertClassHelpDialogProps {
  trigger?: React.ReactNode
}

export const ExpertClassHelpDialog = ({ trigger }: ExpertClassHelpDialogProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-1.5">
            <HelpCircle className="h-4 w-4" />
            <span className="hidden sm:inline">How it works</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            How ExpertClass Works
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Overview */}
            <div className="bg-primary/10 rounded-lg p-4">
              <p className="text-sm">
                ExpertClass allows verified experts to host live video training sessions. 
                Participants can join, learn, and interact in real-time with industry professionals.
              </p>
            </div>

            <Separator />

            {/* For Experts */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                For Experts (Hosts)
              </h3>

              <HelpSection icon={<Calendar className="h-4 w-4 text-primary" />} title="Creating a Class">
                <ol className="list-decimal list-inside space-y-1">
                  <li>Click the <Badge variant="secondary" className="text-xs">Create</Badge> button</li>
                  <li>Fill in title, description, and category</li>
                  <li>Set date, time, and duration</li>
                  <li>Choose free or paid (set price)</li>
                  <li>Click "Create Class" to schedule</li>
                </ol>
              </HelpSection>

              <HelpSection icon={<Video className="h-4 w-4 text-primary" />} title="Starting Your Class">
                <ul className="list-disc list-inside space-y-1">
                  <li>Go to "My Classes" tab to find your scheduled class</li>
                  <li>Click <Badge variant="secondary" className="text-xs">Start Class</Badge> when ready</li>
                  <li>You'll automatically become the host/moderator</li>
                  <li>Class status changes to <Badge className="bg-red-500 text-xs">LIVE</Badge></li>
                  <li>Participants waiting will be notified and can join</li>
                </ul>
              </HelpSection>

              <HelpSection icon={<Users className="h-4 w-4 text-primary" />} title="Host Controls">
                <ul className="list-disc list-inside space-y-1">
                  <li>Mute/unmute participants</li>
                  <li>Enable screen sharing</li>
                  <li>Use chat and raise hand features</li>
                  <li>View participant list</li>
                  <li>End class when finished (updates to "Ended" status)</li>
                </ul>
              </HelpSection>
            </div>

            <Separator />

            {/* For Participants */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                For Participants
              </h3>

              <HelpSection icon={<Calendar className="h-4 w-4 text-primary" />} title="Finding Classes">
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Live & Upcoming:</strong> Active and scheduled classes</li>
                  <li><strong>Featured:</strong> Popular classes with most participants</li>
                  <li><strong>Past:</strong> Ended classes (recordings if available)</li>
                  <li>Use search to find by topic, expert, or category</li>
                </ul>
              </HelpSection>

              <HelpSection icon={<Clock className="h-4 w-4 text-primary" />} title="Joining a Class">
                <ul className="list-disc list-inside space-y-1">
                  <li>Click <Badge variant="secondary" className="text-xs">Join</Badge> on any live class</li>
                  <li>For scheduled classes, you'll enter a waiting room</li>
                  <li>Wait for the expert to start the session</li>
                  <li>You'll be automatically connected when class begins</li>
                </ul>
              </HelpSection>

              <HelpSection icon={<MessageCircle className="h-4 w-4 text-primary" />} title="In-Class Features">
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="flex items-center gap-2 text-xs">
                    <Mic className="h-3.5 w-3.5" /> Microphone on/off
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Camera className="h-3.5 w-3.5" /> Camera on/off
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Hand className="h-3.5 w-3.5" /> Raise hand
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <MessageCircle className="h-3.5 w-3.5" /> In-class chat
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Share2 className="h-3.5 w-3.5" /> Share class link
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Users className="h-3.5 w-3.5" /> View participants
                  </div>
                </div>
              </HelpSection>
            </div>

            <Separator />

            {/* Important Notes */}
            <div className="space-y-3">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Important Notes
              </h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span><strong>Only experts can create and host classes.</strong> Apply to become an expert if you want to teach.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span><strong>Classes won't start until the expert joins.</strong> Participants see a waiting room until then.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span><strong>Allow camera and microphone access</strong> in your browser for the best experience.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span><strong>Use a stable internet connection</strong> for smooth video streaming.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span><strong>Share class links</strong> to invite others to join your session.</span>
                </li>
              </ul>
            </div>

            {/* Troubleshooting */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-sm">Troubleshooting</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• <strong>Can't see video?</strong> Check browser permissions for camera/mic</li>
                <li>• <strong>Audio issues?</strong> Ensure correct audio device is selected</li>
                <li>• <strong>Class not loading?</strong> Refresh the page or rejoin</li>
                <li>• <strong>"Waiting for moderator"?</strong> The expert hasn't started yet</li>
              </ul>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
