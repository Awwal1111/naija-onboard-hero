import React from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import CallHistory from '@/components/CallHistory'
import { Button } from '@/components/ui/button'

const CallHistoryPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background border-b border-border px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <h1 className="text-xl font-semibold">Call History</h1>
      </header>

      <CallHistory />
    </div>
  )
}

export default CallHistoryPage
