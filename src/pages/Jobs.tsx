import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Clock, DollarSign, Users, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useJobs } from '@/hooks/useJobs'
import { useAuth } from '@/hooks/useAuth'
import JobPostingDialog from '@/components/JobPostingDialog'

const Jobs = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { jobs, loading, applyToJob } = useJobs()
  const [selectedJob, setSelectedJob] = useState<string | null>(null)
  const [coverLetter, setCoverLetter] = useState('')
  const [applying, setApplying] = useState(false)

  const handleApply = async (jobId: string) => {
    setApplying(true)
    const { error } = await applyToJob(jobId, coverLetter)
    if (!error) {
      setSelectedJob(null)
      setCoverLetter('')
    }
    setApplying(false)
  }

  const formatBudget = (min?: number, max?: number) => {
    if (!min && !max) return 'Budget not specified'
    if (min && max) return `₦${min.toLocaleString()} - ₦${max.toLocaleString()}`
    if (min) return `From ₦${min.toLocaleString()}`
    if (max) return `Up to ₦${max.toLocaleString()}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          <h1 className="text-2xl font-bold text-text-primary">Gigs</h1>
            <div className="ml-auto">
              <div className="w-32 h-10 bg-background-secondary rounded animate-pulse"></div>
            </div>
          </div>

          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-background-secondary rounded mb-3 w-3/4"></div>
                  <div className="h-4 bg-background-secondary rounded mb-2 w-1/2"></div>
                  <div className="h-4 bg-background-secondary rounded w-full"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-text-primary">Gigs</h1>
          
          <div className="ml-auto">
            <JobPostingDialog
              trigger={
                      <Button className="gap-2">
                        <Briefcase className="h-4 w-4" />
                        Post Gig
                      </Button>
              }
            />
          </div>
        </div>

        {jobs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Briefcase className="h-12 w-12 text-text-secondary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-text-primary mb-2">No Gigs Available</h3>
              <p className="text-text-secondary mb-4">Be the first to post a gig opportunity!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{job.title}</CardTitle>
                      
                      <div className="flex items-center gap-4 text-sm text-text-secondary mb-3">
                        {job.poster_profile && (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={job.poster_profile.profile_picture_url} />
                              <AvatarFallback className="text-xs">
                                {job.poster_profile.full_name?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{job.poster_profile.full_name}</span>
                            {job.poster_profile.profession && (
                              <span className="text-text-tertiary">• {job.poster_profile.profession}</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          {formatBudget(job.budget_min, job.budget_max)}
                        </div>
                        
                        {job.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {job.location}
                          </div>
                        )}
                        
                        {job.job_type && (
                          <Badge variant="secondary" className="capitalize">
                            {job.job_type}
                          </Badge>
                        )}
                        
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(job.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    {user?.id !== job.user_id && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm">Apply Now</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Apply for {job.title}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="cover-letter">Cover Letter (Optional)</Label>
                              <Textarea
                                id="cover-letter"
                                value={coverLetter}
                                onChange={(e) => setCoverLetter(e.target.value)}
                                placeholder="Tell the employer why you're perfect for this job..."
                                rows={5}
                              />
                            </div>
                            
                            <div className="flex gap-2">
                              <Button 
                                onClick={() => handleApply(job.id)}
                                disabled={applying}
                                className="flex-1"
                              >
                                {applying ? 'Applying...' : 'Submit Application'}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <p className="text-text-primary mb-4 whitespace-pre-wrap break-words overflow-hidden">
                    {job.description.length > 200 ? job.description.substring(0, 200) + '...' : job.description}
                  </p>
                  
                  {job.required_skills && job.required_skills.length > 0 && (
                    <div>
                      <h4 className="font-medium text-text-primary mb-2">Required Skills:</h4>
                      <div className="flex flex-wrap gap-2">
                        {job.required_skills.map((skill) => (
                          <Badge key={skill} variant="outline">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Jobs