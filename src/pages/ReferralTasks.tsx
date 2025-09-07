import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { ReferralTaskCard } from '@/components/ReferralTaskCard'
import { useReferralTasks } from '@/hooks/useReferralTasks'

export const ReferralTasks = () => {
  const navigate = useNavigate()
  const { tasks, loading, submitTask, hasSubmitted, getSubmissionStatus } = useReferralTasks()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border px-6 py-4 flex items-center justify-between">
        <button onClick={() => navigate('/earn')} className="flex items-center gap-2">
          <ArrowLeft className="h-5 w-5 text-text-secondary" />
        </button>
        <Logo />
        <div className="w-5" />
      </header>

      <div className="px-6 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary mb-2">Referral Tasks</h1>
          <p className="text-text-secondary">Complete referral tasks by signing up for partner services and earn rewards!</p>
        </div>

        {loading ? (
          <div className="flex justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-text-secondary">Loading referral tasks...</p>
            </div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center p-8 text-text-secondary">
            No referral tasks available right now. Check back later!
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tasks.map((task) => (
              <ReferralTaskCard
                key={task.id}
                task={task}
                hasSubmitted={hasSubmitted(task.id)}
                submissionStatus={getSubmissionStatus(task.id)}
                onSubmit={submitTask}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}