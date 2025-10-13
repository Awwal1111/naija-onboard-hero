import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { ReferralTaskCard } from '@/components/ReferralTaskCard'
import { useReferralTasks } from '@/hooks/useReferralTasks'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export const ReferralTasks = () => {
  const navigate = useNavigate()
  const { tasks, loading, submitTask, hasSubmitted, getSubmissionStatus } = useReferralTasks()
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('reward-high')

  const filteredAndSortedTasks = tasks
    .filter(task => {
      if (statusFilter === 'all') return true
      if (statusFilter === 'available') return !hasSubmitted(task.id)
      const status = getSubmissionStatus(task.id)
      return status === statusFilter
    })
    .sort((a, b) => {
      if (sortBy === 'reward-high') return b.reward - a.reward
      if (sortBy === 'reward-low') return a.reward - b.reward
      return 0
    })

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-background border-b border-border px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => navigate('/earn')} className="flex items-center gap-1 sm:gap-2">
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 text-text-secondary" />
        </button>
        <Logo className="h-6 sm:h-8" />
        <div className="w-4 sm:w-5" />
      </header>

      <div className="px-3 sm:px-6 py-3 sm:py-6">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary mb-1 sm:mb-2">Referral Tasks</h1>
          <p className="text-xs sm:text-sm text-text-secondary">Complete referral tasks by signing up for partner services and earn rewards!</p>
        </div>

        {/* Filters */}
        <div className="mb-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
              <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 h-auto">
                <TabsTrigger value="all" className="text-xs sm:text-sm py-1.5 sm:py-2">All</TabsTrigger>
                <TabsTrigger value="available" className="text-xs sm:text-sm py-1.5 sm:py-2">Available</TabsTrigger>
                <TabsTrigger value="pending" className="text-xs sm:text-sm py-1.5 sm:py-2">Pending</TabsTrigger>
                <TabsTrigger value="approved" className="text-xs sm:text-sm py-1.5 sm:py-2">Approved</TabsTrigger>
                <TabsTrigger value="rejected" className="text-xs sm:text-sm py-1.5 sm:py-2">Rejected</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm text-text-secondary whitespace-nowrap">Sort by:</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[180px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reward-high">Highest Reward</SelectItem>
                <SelectItem value="reward-low">Lowest Reward</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-6 sm:p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-xs sm:text-sm text-text-secondary">Loading referral tasks...</p>
            </div>
          </div>
        ) : filteredAndSortedTasks.length === 0 ? (
          <div className="text-center p-6 sm:p-8 text-text-secondary text-sm">
            {statusFilter === 'all' 
              ? 'No referral tasks available right now. Check back later!'
              : `No ${statusFilter} tasks found.`
            }
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAndSortedTasks.map((task) => (
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