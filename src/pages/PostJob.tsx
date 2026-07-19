import React from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { CreateJobPostDialog } from '@/components/CreateJobPostDialog'
import { BlogTip } from '@/components/BlogTip'

/**
 * Full-page wrapper for posting a real Job (job_posts table).
 * Distinct from PostGig (jobs_services) which is a service listing.
 */
const PostJob = () => {
  const navigate = useNavigate()
  const [open, setOpen] = React.useState(true)

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) navigate('/jobs')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </button>
        <h1 className="font-semibold">Post a Job</h1>
        <div className="w-5" />
      </header>

      <div className="px-4 sm:px-6 py-8 max-w-2xl mx-auto text-center">
        <h2 className="text-lg font-semibold mb-2">Hire talent on NaijaLancers</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Describe what you need. Freelancers will apply and you'll review them in your Job dashboard.
        </p>
      </div>

      <CreateJobPostDialog
        open={open}
        onOpenChange={handleOpenChange}
        onSuccess={() => navigate('/jobs')}
      />
    </div>
  )
}

export default PostJob
