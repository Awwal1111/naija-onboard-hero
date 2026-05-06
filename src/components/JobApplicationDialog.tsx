import React, { useState } from 'react'
import { Upload, FileText, Calendar, DollarSign, X, Wand2, ChevronDown, ChevronUp } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { BrandInput } from '@/components/ui/brand-input'
import { Label } from '@/components/ui/label'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { supabase } from '@/integrations/supabase/client'

interface JobPost {
  id: string
  title: string
  company_name?: string
  budget_min?: number
  budget_max?: number
  currency?: string
  user_id: string
  profiles?: {
    full_name: string
  }
}

interface JobApplicationDialogProps {
  isOpen: boolean
  onClose: () => void
  jobPost: JobPost | null
}

const JobApplicationDialog: React.FC<JobApplicationDialogProps> = ({
  isOpen,
  onClose,
  jobPost
}) => {
  const { user } = useAuth()
  const { profile } = useProfile()
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)
  const [showAIWriter, setShowAIWriter] = useState(false)
  
  const [formData, setFormData] = useState({
    coverLetter: '',
    expectedSalary: '',
    availabilityDate: '',
    portfolioUrls: ['']
  })
  
  const [resumeFile, setResumeFile] = useState<File | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !jobPost) return

    setSubmitting(true)

    try {
      let resumeUrl = null

      // EGRESS PROTECTION: Resumes uploaded to Catbox (free unlimited bandwidth)
      if (resumeFile) {
        const formData = new FormData()
        formData.append('reqtype', 'fileupload')
        formData.append('fileToUpload', resumeFile)
        const res = await fetch('https://catbox.moe/user/api.php', { method: 'POST', body: formData })
        if (!res.ok) throw new Error('Failed to upload resume')
        const url = (await res.text()).trim()
        if (!url.startsWith('https://files.catbox.moe/')) throw new Error('Invalid upload response')
        resumeUrl = url
      }

      // Submit application using existing job_post_applications table
      const { data: application, error: applicationError } = await supabase
        .from('job_post_applications')
        .insert({
          job_post_id: jobPost.id,
          applicant_id: user.id,
          cover_letter: formData.coverLetter.trim() || null,
          resume_url: resumeUrl,
          expected_salary: formData.expectedSalary ? parseFloat(formData.expectedSalary) : null,
          availability_date: formData.availabilityDate || null,
          portfolio_urls: formData.portfolioUrls.filter(url => url.trim()),
          status: 'pending'
        })
        .select()
        .single()

      if (applicationError) throw applicationError

      // Get applicant name for notification
      const { data: applicantProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single()

      // Notify the job poster about the new application
      await supabase.functions.invoke('send-notification', {
        body: {
          userId: jobPost.user_id,
          type: 'job_application',
          title: 'New Job Application! 📄',
          message: `${applicantProfile?.full_name || 'Someone'} applied for "${jobPost.title}"`,
          metadata: {
            job_post_id: jobPost.id,
            application_id: application.id,
            applicant_id: user.id,
            applicant_name: applicantProfile?.full_name,
            job_title: jobPost.title
          },
          sendEmail: true,
          emailTemplate: 'general'
        }
      })

      toast({
        title: "Application submitted successfully!",
        description: `Your application for "${jobPost.title}" has been sent to ${jobPost.profiles?.full_name || 'the employer'}.`,
      })

      onClose()
      
      // Reset form
      setFormData({
        coverLetter: '',
        expectedSalary: '',
        availabilityDate: '',
        portfolioUrls: ['']
      })
      setResumeFile(null)

    } catch (error: any) {
      console.error('Application submission error:', error)
      toast({
        title: "Application failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file type (PDF, DOC, DOCX)
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or Word document.",
          variant: "destructive",
        })
        return
      }

      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 5MB.",
          variant: "destructive",
        })
        return
      }

      setResumeFile(file)
    }
  }

  const addPortfolioUrl = () => {
    setFormData(prev => ({
      ...prev,
      portfolioUrls: [...prev.portfolioUrls, '']
    }))
  }

  const removePortfolioUrl = (index: number) => {
    setFormData(prev => ({
      ...prev,
      portfolioUrls: prev.portfolioUrls.filter((_, i) => i !== index)
    }))
  }

  const updatePortfolioUrl = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      portfolioUrls: prev.portfolioUrls.map((url, i) => i === index ? value : url)
    }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-text-primary">
            Apply for {jobPost?.title}
          </DialogTitle>
          <p className="text-text-secondary">
            {jobPost?.company_name && `at ${jobPost.company_name} • `}
            Posted by {jobPost?.profiles?.full_name}
          </p>
          {jobPost?.budget_min && jobPost?.budget_max && (
            <div className="flex items-center gap-2 text-sm text-primary font-medium">
              <DollarSign className="h-4 w-4" />
              <span>
                {jobPost.currency || 'NGN'} {jobPost.budget_min.toLocaleString()} - {jobPost.budget_max.toLocaleString()}
              </span>
            </div>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* AI Proposal Writer */}
          <Collapsible open={showAIWriter} onOpenChange={setShowAIWriter}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 border-primary/30 bg-primary/5 hover:bg-primary/10"
              >
                <Wand2 className="h-4 w-4 text-primary" />
                <span>AI Proposal Writer</span>
                {showAIWriter ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Let AI craft a compelling cover letter based on your profile and the job requirements.
                </p>
                <Button
                  type="button"
                  onClick={async () => {
                    if (!profile?.full_name) {
                      toast({
                        title: "Profile required",
                        description: "Please complete your profile first",
                        variant: "destructive"
                      });
                      return;
                    }
                    setGeneratingAI(true);
                    try {
                      const { data, error } = await supabase.functions.invoke('ai-proposal-writer', {
                        body: {
                          jobTitle: jobPost?.title || '',
                          jobDescription: 'Apply for this exciting opportunity',
                          jobBudget: jobPost?.budget_min && jobPost?.budget_max 
                            ? `${jobPost.currency || 'NGN'} ${jobPost.budget_min} - ${jobPost.budget_max}` 
                            : undefined,
                          freelancerName: profile.full_name,
                          freelancerProfession: profile.profession,
                          freelancerExperience: profile.bio,
                          tone: 'professional'
                        }
                      });
                      if (data?.success && data.proposal) {
                        setFormData(prev => ({ ...prev, coverLetter: data.proposal }));
                        toast({ title: "Proposal generated! ✨", description: "Review and customize before submitting" });
                        setShowAIWriter(false);
                      } else {
                        throw new Error(data?.error || 'Failed to generate');
                      }
                    } catch (error: any) {
                      toast({ title: "Generation failed", description: error.message, variant: "destructive" });
                    } finally {
                      setGeneratingAI(false);
                    }
                  }}
                  disabled={generatingAI}
                  className="w-full"
                >
                  {generatingAI ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                      Crafting proposal...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generate AI Proposal
                    </>
                  )}
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Cover Letter */}
          <div className="space-y-2">
            <Label htmlFor="coverLetter">Cover Letter *</Label>
            <Textarea
              id="coverLetter"
              placeholder="Introduce yourself and explain why you're the perfect fit for this role..."
              value={formData.coverLetter}
              onChange={(e) => setFormData(prev => ({ ...prev, coverLetter: e.target.value }))}
              className="min-h-[120px] resize-none"
              required
            />
            <p className="text-xs text-muted-foreground">
              {formData.coverLetter.length}/500 characters
            </p>
          </div>

          {/* Resume Upload */}
          <div className="space-y-2">
            <Label htmlFor="resume">Resume/CV</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <input
                id="resume"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
              <label 
                htmlFor="resume" 
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="h-8 w-8 text-text-secondary" />
                <div>
                  <p className="font-medium text-text-primary">
                    {resumeFile ? resumeFile.name : 'Upload your resume'}
                  </p>
                  <p className="text-sm text-text-secondary">
                    PDF, DOC, or DOCX (max 5MB)
                  </p>
                </div>
              </label>
              {resumeFile && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setResumeFile(null)}
                  className="mt-2"
                >
                  <X className="h-4 w-4 mr-1" />
                  Remove file
                </Button>
              )}
            </div>
          </div>

          {/* Expected Salary */}
          <div className="space-y-2">
            <Label htmlFor="expectedSalary">Expected Salary ({jobPost?.currency || 'NGN'})</Label>
            <BrandInput
              id="expectedSalary"
              type="number"
              placeholder="Enter your expected salary..."
              value={formData.expectedSalary}
              onChange={(e) => setFormData(prev => ({ ...prev, expectedSalary: e.target.value }))}
            />
          </div>

          {/* Availability Date */}
          <div className="space-y-2">
            <Label htmlFor="availabilityDate">Available From</Label>
            <BrandInput
              id="availabilityDate"
              type="date"
              value={formData.availabilityDate}
              onChange={(e) => setFormData(prev => ({ ...prev, availabilityDate: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Portfolio URLs */}
          <div className="space-y-2">
            <Label>Portfolio Links (Optional)</Label>
            {formData.portfolioUrls.map((url, index) => (
              <div key={index} className="flex gap-2">
                <BrandInput
                  type="url"
                  placeholder="https://your-portfolio.com"
                  value={url}
                  onChange={(e) => updatePortfolioUrl(index, e.target.value)}
                  className="flex-1"
                />
                {formData.portfolioUrls.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removePortfolioUrl(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {formData.portfolioUrls.length < 3 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPortfolioUrl}
                className="w-full"
              >
                + Add another portfolio link
              </Button>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !formData.coverLetter.trim()}
              className="flex-1 bg-brand-green hover:bg-brand-green-hover"
            >
              {submitting ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Submit Application
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default JobApplicationDialog