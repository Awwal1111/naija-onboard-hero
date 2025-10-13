import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

interface EnhancedJobPostingDialogProps {
  trigger: React.ReactNode;
  onJobCreated?: () => void;
}

export default function EnhancedJobPostingDialog({ trigger, onJobCreated }: EnhancedJobPostingDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    company_name: "",
    description: "",
    requirements: "",
    responsibilities: "",
    location: "",
    job_type: "full-time" as "full-time" | "part-time" | "contract" | "freelance" | "internship",
    is_remote: false,
    experience_level: "intermediate" as "entry" | "intermediate" | "senior" | "expert",
    industry: "",
    company_size: "11-50" as "1-10" | "11-50" | "51-200" | "201-500" | "501-1000" | "1000+",
    budget_min: "",
    budget_max: "",
    salary_period: "monthly" as "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "project",
    is_negotiable: false,
    work_schedule: "",
    application_deadline: "",
    application_instructions: "",
    contact_email: "",
    contact_phone: "",
    company_website: "",
    company_logo_url: "",
    required_skills: [] as string[],
    benefits: [{ item: "" }],
    qualifications: [{ item: "" }],
  });

  const createJobMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (!data.title || !data.description) {
        throw new Error("Please fill in all required fields");
      }

      const benefitsList = data.benefits.filter(b => b.item).map(b => b.item);
      const qualificationsList = data.qualifications.filter(q => q.item).map(q => q.item);

      const { error } = await supabase.from("job_posts").insert({
        user_id: user.id,
        title: data.title,
        company_name: data.company_name,
        description: data.description,
        requirements: data.requirements || null,
        responsibilities: data.responsibilities || null,
        location: data.location || null,
        job_type: data.job_type,
        is_remote: data.is_remote,
        experience_level: data.experience_level,
        industry: data.industry || null,
        company_size: data.company_size || null,
        budget_min: data.budget_min ? parseFloat(data.budget_min) : null,
        budget_max: data.budget_max ? parseFloat(data.budget_max) : null,
        salary_period: data.salary_period,
        is_negotiable: data.is_negotiable,
        work_schedule: data.work_schedule || null,
        application_deadline: data.application_deadline ? new Date(data.application_deadline).toISOString() : null,
        application_instructions: data.application_instructions || null,
        contact_email: data.contact_email || null,
        contact_phone: data.contact_phone || null,
        company_website: data.company_website || null,
        company_logo_url: data.company_logo_url || null,
        required_skills: data.required_skills,
        benefits: benefitsList,
        qualifications: qualificationsList,
        status: "open",
      } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Job posted successfully!" });
      queryClient.invalidateQueries({ queryKey: ["jobs-enhanced"] });
      setOpen(false);
      onJobCreated?.();
      // Reset form
      setFormData({
        title: "",
        company_name: "",
        description: "",
        requirements: "",
        responsibilities: "",
        location: "",
        job_type: "full-time",
        is_remote: false,
        experience_level: "intermediate",
        industry: "",
        company_size: "11-50",
        budget_min: "",
        budget_max: "",
        salary_period: "monthly",
        is_negotiable: false,
        work_schedule: "",
        application_deadline: "",
        application_instructions: "",
        contact_email: "",
        contact_phone: "",
        company_website: "",
        company_logo_url: "",
        required_skills: [],
        benefits: [{ item: "" }],
        qualifications: [{ item: "" }],
      });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to post job", variant: "destructive" });
    },
  });

  const addSkill = (skill: string) => {
    if (skill && !formData.required_skills.includes(skill)) {
      setFormData({ ...formData, required_skills: [...formData.required_skills, skill] });
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({
      ...formData,
      required_skills: formData.required_skills.filter(s => s !== skill),
    });
  };

  const addBenefit = () => {
    setFormData({ ...formData, benefits: [...formData.benefits, { item: "" }] });
  };

  const removeBenefit = (index: number) => {
    setFormData({
      ...formData,
      benefits: formData.benefits.filter((_, i) => i !== index),
    });
  };

  const updateBenefit = (index: number, value: string) => {
    const updated = [...formData.benefits];
    updated[index].item = value;
    setFormData({ ...formData, benefits: updated });
  };

  const addQualification = () => {
    setFormData({ ...formData, qualifications: [...formData.qualifications, { item: "" }] });
  };

  const removeQualification = (index: number) => {
    setFormData({
      ...formData,
      qualifications: formData.qualifications.filter((_, i) => i !== index),
    });
  };

  const updateQualification = (index: number, value: string) => {
    const updated = [...formData.qualifications];
    updated[index].item = value;
    setFormData({ ...formData, qualifications: updated });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-3xl">
        <DialogHeader>
          <DialogTitle>Post a Job Opening</DialogTitle>
          <p className="text-sm text-muted-foreground">Fill in all details to attract qualified candidates</p>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Basic Information */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="font-semibold">Basic Information</h3>
            
            <div className="space-y-2">
              <Label>Job Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Senior React Developer"
                maxLength={100}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="Your company"
                />
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                <Input
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  placeholder="e.g., Technology, Healthcare"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Job Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed description of the role"
                rows={4}
              />
            </div>
          </div>

          {/* Job Details */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="font-semibold">Job Details</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Job Type</Label>
                <Select value={formData.job_type} onValueChange={(v: any) => setFormData({ ...formData, job_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border z-50">
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="freelance">Freelance</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Experience Level</Label>
                <Select value={formData.experience_level} onValueChange={(v: any) => setFormData({ ...formData, experience_level: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border z-50">
                    <SelectItem value="entry">Entry Level</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="City, State or Country"
                />
              </div>
              <div className="space-y-2">
                <Label>Company Size</Label>
                <Select value={formData.company_size} onValueChange={(v: any) => setFormData({ ...formData, company_size: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border z-50">
                    <SelectItem value="1-10">1-10 employees</SelectItem>
                    <SelectItem value="11-50">11-50 employees</SelectItem>
                    <SelectItem value="51-200">51-200 employees</SelectItem>
                    <SelectItem value="201-500">201-500 employees</SelectItem>
                    <SelectItem value="501-1000">501-1000 employees</SelectItem>
                    <SelectItem value="1000+">1000+ employees</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                checked={formData.is_remote}
                onCheckedChange={(checked) => setFormData({ ...formData, is_remote: checked as boolean })}
              />
              <Label>Remote Work Available</Label>
            </div>

            <div className="space-y-2">
              <Label>Work Schedule</Label>
              <Input
                value={formData.work_schedule}
                onChange={(e) => setFormData({ ...formData, work_schedule: e.target.value })}
                placeholder="e.g., Monday-Friday, 9am-5pm"
              />
            </div>
          </div>

          {/* Compensation */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="font-semibold">Compensation</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Minimum Salary (₦)</Label>
                <Input
                  type="number"
                  value={formData.budget_min}
                  onChange={(e) => setFormData({ ...formData, budget_min: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Maximum Salary (₦)</Label>
                <Input
                  type="number"
                  value={formData.budget_max}
                  onChange={(e) => setFormData({ ...formData, budget_max: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Period</Label>
                <Select value={formData.salary_period} onValueChange={(v: any) => setFormData({ ...formData, salary_period: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border z-50">
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="project">Per Project</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                checked={formData.is_negotiable}
                onCheckedChange={(checked) => setFormData({ ...formData, is_negotiable: checked as boolean })}
              />
              <Label>Salary is Negotiable</Label>
            </div>

            <div className="space-y-2">
              <Label>Benefits & Perks</Label>
              {formData.benefits.map((benefit, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="e.g., Health Insurance, Flexible Hours"
                    value={benefit.item}
                    onChange={(e) => updateBenefit(index, e.target.value)}
                    className="flex-1"
                  />
                  {formData.benefits.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeBenefit(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addBenefit} className="w-full">
                <Plus className="h-4 w-4 mr-1" />
                Add Benefit
              </Button>
            </div>
          </div>

          {/* Requirements */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="font-semibold">Requirements & Qualifications</h3>
            
            <div className="space-y-2">
              <Label>Responsibilities</Label>
              <Textarea
                value={formData.responsibilities}
                onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                placeholder="What will this person be responsible for?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Requirements</Label>
              <Textarea
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                placeholder="Technical skills, experience, education required"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Required Skills</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a skill and press Enter"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSkill(e.currentTarget.value);
                      e.currentTarget.value = "";
                    }
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.required_skills.map((skill) => (
                  <div key={skill} className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded text-sm">
                    {skill}
                    <button onClick={() => removeSkill(skill)} className="ml-1 text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Preferred Qualifications</Label>
              {formData.qualifications.map((qual, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="e.g., Master's degree, AWS Certification"
                    value={qual.item}
                    onChange={(e) => updateQualification(index, e.target.value)}
                    className="flex-1"
                  />
                  {formData.qualifications.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeQualification(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addQualification} className="w-full">
                <Plus className="h-4 w-4 mr-1" />
                Add Qualification
              </Button>
            </div>
          </div>

          {/* Application Details */}
          <div className="space-y-4">
            <h3 className="font-semibold">Application Details</h3>
            
            <div className="space-y-2">
              <Label>Application Deadline</Label>
              <Input
                type="date"
                value={formData.application_deadline}
                onChange={(e) => setFormData({ ...formData, application_deadline: e.target.value })}
                min={format(new Date(), "yyyy-MM-dd")}
              />
            </div>

            <div className="space-y-2">
              <Label>Application Instructions</Label>
              <Textarea
                value={formData.application_instructions}
                onChange={(e) => setFormData({ ...formData, application_instructions: e.target.value })}
                placeholder="Special instructions for applicants"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Email</Label>
                <Input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  placeholder="hiring@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  placeholder="+234 XXX XXX XXXX"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Company Website</Label>
              <Input
                value={formData.company_website}
                onChange={(e) => setFormData({ ...formData, company_website: e.target.value })}
                placeholder="https://company.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Company Logo URL</Label>
              <Input
                value={formData.company_logo_url}
                onChange={(e) => setFormData({ ...formData, company_logo_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>

          <Button
            className="w-full"
            onClick={() => createJobMutation.mutate(formData)}
            disabled={createJobMutation.isPending || !formData.title || !formData.description}
          >
            {createJobMutation.isPending ? "Posting..." : "Post Job"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}