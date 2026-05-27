import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Handshake, Check, X } from 'lucide-react'
import { useChatIntro } from '@/hooks/useChatIntro'
import { useNavigate } from 'react-router-dom'

const IntroRequestsList: React.FC = () => {
  const { inbox, acceptIntro, declineIntro, loading } = useChatIntro()
  const navigate = useNavigate()
  const [busyId, setBusyId] = useState<string | null>(null)

  if (inbox.length === 0) return null

  return (
    <Card className="mb-4 border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-primary">
          <Handshake className="h-4 w-4" />
          Introductions ({inbox.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {inbox.map((intro) => (
          <div key={intro.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
            <Avatar className="h-10 w-10">
              <AvatarImage src={intro.sender_profile?.profile_picture_url || undefined} />
              <AvatarFallback>
                {(intro.sender_profile?.full_name || '?').charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {intro.sender_profile?.full_name || 'Someone'}
                {intro.sender_profile?.profession && (
                  <span className="text-text-secondary font-normal"> · {intro.sender_profile.profession}</span>
                )}
              </p>
              <p className="text-sm text-foreground/80 mt-1 line-clamp-3">{intro.message}</p>
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  disabled={loading || busyId === intro.id}
                  onClick={async () => {
                    setBusyId(intro.id)
                    const ok = await acceptIntro(intro.id)
                    setBusyId(null)
                    if (ok) navigate(`/chat/${intro.sender_id}`)
                  }}
                >
                  <Check className="h-3 w-3 mr-1" /> Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={loading || busyId === intro.id}
                  onClick={async () => {
                    setBusyId(intro.id)
                    await declineIntro(intro.id)
                    setBusyId(null)
                  }}
                >
                  <X className="h-3 w-3 mr-1" /> Decline
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default IntroRequestsList
