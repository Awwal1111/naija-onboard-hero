import React, { useState, useEffect } from 'react'
import { ArrowLeft, Check, X, Mail, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { BrandButton } from '@/components/ui/brand-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { AdminReferralTasks } from '@/components/AdminReferralTasks'
import { AdminDailySigninStats } from '@/components/AdminDailySigninStats'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'

interface ExpertApplication {
  id: string
  user_id: string
  full_name: string
  email: string
  phone_number: string
  skill_category: string
  years_experience: number
  portfolio_link?: string
  location_state: string
  location_lga: string
  location_area: string
  status: string
  submitted_at: string
  admin_feedback?: string
  reviewed_at?: string
}

const AdminExpertApplications = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const [applications, setApplications] = useState<ExpertApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApplication, setSelectedApplication] = useState<ExpertApplication | null>(null)
  const [feedback, setFeedback] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('expert_applications')
        .select('*')
        .order('submitted_at', { ascending: false })

      if (error) throw error
      setApplications(data || [])
    } catch (error) {
      console.error('Error fetching applications:', error)
      toast({
        title: "Error",
        description: "Failed to fetch applications",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const updateApplicationStatus = async (applicationId: string, status: 'approved' | 'rejected', adminFeedback?: string) => {
    setProcessing(applicationId)
    
    try {
      // Update application status
      const { error: updateError } = await supabase
        .from('expert_applications')
        .update({
          status,
          admin_feedback: adminFeedback || null,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', applicationId)

      if (updateError) throw updateError

      // If approved, update profile to expert status
      if (status === 'approved') {
        const application = applications.find(app => app.id === applicationId)
        if (application) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              is_expert: true,
              expert_verified_at: new Date().toISOString()
            })
            .eq('user_id', application.user_id)

          if (profileError) throw profileError
        }
      }

      // Send notification email
      await supabase.functions.invoke('send-expert-notification', {
        body: {
          applicationId,
          status,
          feedback: adminFeedback
        }
      })

      toast({
        title: "Success",
        description: `Application ${status} successfully. Email notification sent.`
      })

      fetchApplications()
    } catch (error) {
      console.error('Error updating application:', error)
      toast({
        title: "Error",
        description: "Failed to update application",
        variant: "destructive"
      })
    } finally {
      setProcessing(null)
      setSelectedApplication(null)
      setFeedback('')
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'default',
      approved: 'default',
      rejected: 'destructive'
    }
    
    return (
      <Badge variant={variants[status as keyof typeof variants] as any} className={
        status === 'approved' ? 'bg-green-100 text-green-800' : ''
      }>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-text-secondary">Loading applications...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border px-6 py-4 flex items-center justify-between">
        <button onClick={() => navigate('/profile')} className="flex items-center gap-2">
          <ArrowLeft className="h-5 w-5 text-text-secondary" />
        </button>
        <Logo />
        <div className="w-5" />
      </header>

      <div className="px-6 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary mb-2">Admin Dashboard</h1>
          <p className="text-text-secondary">Manage expert applications and referral tasks</p>
        </div>

        <Tabs defaultValue="applications" className="w-full">
          <TabsList>
            <TabsTrigger value="applications">
              Expert Applications ({applications.filter(app => app.status === 'pending').length} pending)
            </TabsTrigger>
            <TabsTrigger value="referrals">Referral Tasks</TabsTrigger>
            <TabsTrigger value="stats">Daily Sign-in Stats</TabsTrigger>
          </TabsList>

          <TabsContent value="applications" className="space-y-6">

            {applications.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-text-secondary">No applications found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((application) => (
              <Card key={application.id} className="bg-card border border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{application.full_name}</CardTitle>
                    {getStatusBadge(application.status)}
                  </div>
                  <div className="text-sm text-text-secondary">
                    <p>{application.skill_category} • {application.years_experience} years experience</p>
                    <p>{application.location_area}, {application.location_lga}, {application.location_state}</p>
                    <p>Submitted: {new Date(application.submitted_at).toLocaleDateString()}</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <BrandButton
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedApplication(application)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </BrandButton>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Application Details</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="font-medium">Full Name</label>
                              <p className="text-text-secondary">{application.full_name}</p>
                            </div>
                            <div>
                              <label className="font-medium">Email</label>
                              <p className="text-text-secondary">{application.email}</p>
                            </div>
                            <div>
                              <label className="font-medium">Phone</label>
                              <p className="text-text-secondary">{application.phone_number}</p>
                            </div>
                            <div>
                              <label className="font-medium">Skill Category</label>
                              <p className="text-text-secondary">{application.skill_category}</p>
                            </div>
                            <div>
                              <label className="font-medium">Experience</label>
                              <p className="text-text-secondary">{application.years_experience} years</p>
                            </div>
                            <div>
                              <label className="font-medium">Location</label>
                              <p className="text-text-secondary">{application.location_area}, {application.location_lga}, {application.location_state}</p>
                            </div>
                          </div>
                          
                          {application.portfolio_link && (
                            <div>
                              <label className="font-medium">Portfolio</label>
                              <a href={application.portfolio_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline block">
                                {application.portfolio_link}
                              </a>
                            </div>
                          )}

                          {application.status === 'pending' && (
                            <div className="space-y-4 pt-4 border-t">
                              <div>
                                <label className="font-medium block mb-2">Admin Feedback (Optional)</label>
                                <Textarea
                                  value={feedback}
                                  onChange={(e) => setFeedback(e.target.value)}
                                  placeholder="Add feedback for the applicant..."
                                  rows={3}
                                />
                              </div>
                              
                              <div className="flex gap-2">
                                <BrandButton
                                  onClick={() => updateApplicationStatus(application.id, 'approved', feedback)}
                                  disabled={processing === application.id}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  Approve
                                </BrandButton>
                                <BrandButton
                                  variant="secondary"
                                  onClick={() => updateApplicationStatus(application.id, 'rejected', feedback)}
                                  disabled={processing === application.id}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Reject
                                </BrandButton>
                              </div>
                            </div>
                          )}

                          {application.admin_feedback && (
                            <div className="pt-4 border-t">
                              <label className="font-medium">Admin Feedback</label>
                              <p className="text-text-secondary mt-1">{application.admin_feedback}</p>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>

                    {application.status === 'pending' && (
                      <>
                        <BrandButton
                          size="sm"
                          onClick={() => updateApplicationStatus(application.id, 'approved')}
                          disabled={processing === application.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Approve
                        </BrandButton>
                        <BrandButton
                          variant="secondary"
                          size="sm"
                          onClick={() => updateApplicationStatus(application.id, 'rejected')}
                          disabled={processing === application.id}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Reject
                        </BrandButton>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="referrals">
            <AdminReferralTasks />
          </TabsContent>

          <TabsContent value="stats">
            <AdminDailySigninStats />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default AdminExpertApplications