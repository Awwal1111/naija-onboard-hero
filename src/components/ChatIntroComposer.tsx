import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Handshake, Clock, X } from 'lucide-react'
import { useChatIntro } from '@/hooks/useChatIntro'

interface Props {
  otherUserId: string
  otherUserName?: string
}

const ChatIntroComposer: React.FC<Props> = ({ otherUserId, otherUserName }) => {
  const { outgoing, sendIntro, cancelIntro, loading } = useChatIntro(otherUserId)
  const [text, setText] = useState('')

  if (outgoing) {
    return (
      <Card className="mx-4 mb-2 border-primary/30 bg-primary/5">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Clock className="h-4 w-4" />
            Introduction sent
          </div>
          <p className="text-sm text-foreground/80">"{outgoing.message}"</p>
          <p className="text-xs text-text-secondary">
            Waiting for {otherUserName || 'them'} to accept. You can chat once they accept.
          </p>
          <Button
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={() => cancelIntro(outgoing.id)}
          >
            <X className="h-3 w-3 mr-1" /> Cancel
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mx-4 mb-2 border-primary/30 bg-primary/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Handshake className="h-4 w-4" />
          Send an introduction
        </div>
        <p className="text-xs text-text-secondary">
          You're not yet connected with {otherUserName || 'this user'}. There are 3 ways to start a chat:
          <br />1. Be connected with them.
          <br />2. Send a short introduction below (they accept → chat opens).
          <br />3. Upgrade to <a href="/premium" className="underline font-medium text-primary">Premium</a> to DM anyone directly.
        </p>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 500))}
          placeholder="Hi! I'd love to connect because…"
          rows={3}
          maxLength={500}
        />
        <div className="flex justify-between items-center">
          <span className="text-xs text-text-secondary">{text.length}/500</span>
          <Button
            size="sm"
            disabled={loading || !text.trim()}
            onClick={async () => {
              const ok = await sendIntro(text)
              if (ok) setText('')
            }}
          >
            Send introduction
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default ChatIntroComposer
