import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MapPin, Calendar, Briefcase, DollarSign, Clock, Users, ExternalLink, Building2 } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [applyOpen, setApplyOpen] = useState(false);
  const [applicationData, setApplicationData] = useState({
    cover_letter: "",
    resume_url: "",
    expected_salary: "",
    availability_date: "",
    portfolio_urls: [] as string[],
  });

  const { data: job, isLoading } = useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_posts")
        .select(`
          *,
          profiles:user_id (full_name, profile_picture_url, company_name)
        `)
        .eq("id", id)
        .single();
      if (error) throw error;

      // Increment views
      await supabase
        .from("job_posts")
        .update({ views_count: (data.views_count || 0) + 1 })
        .eq("id", id);

      return data;
    },
  });

  const { data: hasApplied } = useQuery({
    queryKey: ["has-applied", id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("job_post_applications")
        .select("id, status")
        .eq("job_post_id", id)
        .eq("applicant_id", user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please log in to apply");

      if (!applicationData.cover_letter || !applicationData.resume_url) {
        throw new Error("Cover letter and resume are required");
      }

      await supabase.from("job_post_applications").insert({
        job_post_id: id,
        applicant_id: user.id,
        cover_letter: applicationData.cover_letter,
        resume_url: applicationData.resume_url,
        expected_salary: applicationData.expected_salary ? parseFloat(applicationData.expected_salary) : null,
        availability_date: applicationData.availability_date || null,
        portfolio_urls: applicationData.portfolio_urls.filter((url) => url.trim() !== ""),
      });
    },
    onSuccess: () => {
      toast({
        title: "Application submitted!",
        description: "The employer will review your application",
      });
      queryClient.invalidateQueries({ queryKey: ["has-applied", id] });
      setApplyOpen(false);
      setApplicationData({
        cover_letter: "",
        resume_url: "",
        expected_salary: "",
        availability_date: "",
        portfolio_urls: [],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Application failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) return <div className="container mx-auto px-4 py-8">Loading...</div>;
  if (!job) return <div className="container mx-auto px-4 py-8">Job not found</div>;

  const daysLeft = job.application_deadline
    ? Math.max(0, Math.ceil((new Date(job.application_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Button onClick={() => navigate("/jobs")} variant="ghost" className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Jobs
        </Button>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{job.title}</h1>
                  <p className="text-xl text-muted-foreground mb-4">{job.company_name}</p>
                  <div className="flex items-center gap-2">
                    {job.is_remote && <Badge variant="secondary">Remote</Badge>}
                    {job.experience_level && <Badge variant="outline">{job.experience_level}</Badge>}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 mb-6 text-muted-foreground">
                {job.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    <span>{job.location}</span>
                  </div>
                )}
                {job.budget_min && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    <span>
                      ₦{job.budget_min?.toLocaleString()} - ₦{job.budget_max?.toLocaleString()}
                    </span>
                  </div>
                )}
                {job.application_deadline && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    <span>Deadline: {format(new Date(job.application_deadline), "PPP")}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span>{job.applications_count || 0} applicants</span>
                </div>
              </div>

              <Card className="p-6 mb-6">
                <h2 className="text-xl font-semibold mb-3">Job Description</h2>
                <p className="whitespace-pre-wrap">{job.description}</p>
              </Card>

              {job.requirements && Array.isArray(job.requirements) && job.requirements.length > 0 && (
                <Card className="p-6 mb-6">
                  <h2 className="text-xl font-semibold mb-3">Requirements</h2>
                  <ul className="list-disc list-inside space-y-2">
                    {job.requirements.map((req: string, index: number) => (
                      <li key={index}>{req}</li>
                    ))}
                  </ul>
                </Card>
              )}

              {job.responsibilities && Array.isArray(job.responsibilities) && job.responsibilities.length > 0 && (
                <Card className="p-6 mb-6">
                  <h2 className="text-xl font-semibold mb-3">Responsibilities</h2>
                  <ul className="list-disc list-inside space-y-2">
                    {job.responsibilities.map((resp: string, index: number) => (
                      <li key={index}>{resp}</li>
                    ))}
                  </ul>
                </Card>
              )}

              {job.benefits && Array.isArray(job.benefits) && job.benefits.length > 0 && (
                <Card className="p-6 mb-6">
                  <h2 className="text-xl font-semibold mb-3">Benefits</h2>
                  <ul className="list-disc list-inside space-y-2">
                    {job.benefits.map((benefit: any, index: number) => (
                      <li key={index}>
                        <strong>{benefit.title}:</strong> {benefit.description}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {job.application_instructions && (
                <Card className="p-6 mb-6 bg-primary/5">
                  <h2 className="text-xl font-semibold mb-3">How to Apply</h2>
                  <p className="whitespace-pre-wrap">{job.application_instructions}</p>
                </Card>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <Card className="p-6 sticky top-6">
              <div className="space-y-4">
                {hasApplied ? (
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="font-semibold mb-2">Application Status</p>
                    <Badge variant={hasApplied.status === "accepted" ? "default" : "secondary"}>
                      {hasApplied.status}
                    </Badge>
                  </div>
                ) : (
                  <Button onClick={() => setApplyOpen(true)} className="w-full" size="lg">
                    Apply Now
                  </Button>
                )}

                <Separator />

                <div className="space-y-3 text-sm">
                  <h3 className="font-semibold">Job Details</h3>
                  {job.job_type && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      <span>{job.job_type}</span>
                    </div>
                  )}
                  {job.company_size && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      <span>{job.company_size} employees</span>
                    </div>
                  )}
                  {job.industry && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      <span>{job.industry}</span>
                    </div>
                  )}
                  {job.company_website && (
                    <Button
                      onClick={() => window.open(job.company_website, "_blank")}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Company Website
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Apply for {job.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cover Letter *</Label>
              <Textarea
                value={applicationData.cover_letter}
                onChange={(e) => setApplicationData({ ...applicationData, cover_letter: e.target.value })}
                placeholder="Tell us why you're a great fit for this role..."
                rows={6}
                required
              />
            </div>

            <div>
              <Label>Resume URL *</Label>
              <Input
                type="url"
                value={applicationData.resume_url}
                onChange={(e) => setApplicationData({ ...applicationData, resume_url: e.target.value })}
                placeholder="https://drive.google.com/..."
                required
              />
              <p className="text-xs text-muted-foreground mt-1">Upload your resume to Google Drive or Dropbox and paste the link</p>
            </div>

            <div>
              <Label>Expected Salary (₦NC)</Label>
              <Input
                type="number"
                value={applicationData.expected_salary}
                onChange={(e) => setApplicationData({ ...applicationData, expected_salary: e.target.value })}
                placeholder="e.g., 500000"
              />
            </div>

            <div>
              <Label>Availability Date</Label>
              <Input
                type="date"
                value={applicationData.availability_date}
                onChange={(e) => setApplicationData({ ...applicationData, availability_date: e.target.value })}
              />
            </div>

            <Button
              onClick={() => applyMutation.mutate()}
              disabled={applyMutation.isPending}
              className="w-full"
            >
              {applyMutation.isPending ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
