import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { X, Loader2, Briefcase, MapPin, Calendar, DollarSign, Plus, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNigerianStates } from '@/hooks/useNigerianStates';
import { AIWritingAssistant } from '@/components/AIWritingAssistant';

interface CreateJobPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const CreateJobPostDialog: React.FC<CreateJobPostDialogProps> = ({
  open,
  onOpenChange,
  onSuccess
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { states } = useNigerianStates();
  const [loading, setLoading] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    company_name: '',
    location: '',
    job_type: 'contract',
    experience_level: 'any',
    budget_min: '',
    budget_max: '',
    required_skills: [] as string[],
    is_remote: false,
    application_deadline: ''
  });

  const jobTypes = ['full-time', 'part-time', 'contract', 'freelance', 'one-time'];
  const experienceLevels = ['any', 'entry', 'intermediate', 'senior', 'expert'];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addSkill = () => {
    if (skillInput.trim() && !formData.required_skills.includes(skillInput.trim())) {
      setFormData(prev => ({
        ...prev,
        required_skills: [...prev.required_skills, skillInput.trim()]
      }));
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      required_skills: prev.required_skills.filter(s => s !== skill)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to post a job",
        variant: "destructive"
      });
      return;
    }

    if (!formData.title || !formData.description) {
      toast({
        title: "Missing Fields",
        description: "Please fill in the title and description",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('job_posts').insert({
        user_id: user.id,
        title: formData.title,
        description: formData.description,
        company_name: formData.company_name || null,
        location: formData.location || null,
        job_type: formData.job_type,
        experience_level: formData.experience_level,
        budget_min: formData.budget_min ? parseFloat(formData.budget_min) : null,
        budget_max: formData.budget_max ? parseFloat(formData.budget_max) : null,
        required_skills: formData.required_skills.length > 0 ? formData.required_skills : null,
        is_remote: formData.is_remote,
        application_deadline: formData.application_deadline || null,
        status: 'open'
      });

      if (error) throw error;

      toast({
        title: "Job Posted! 🎉",
        description: "Your job post is now live and visible to all users"
      });

      onOpenChange(false);
      setFormData({
        title: '',
        description: '',
        company_name: '',
        location: '',
        job_type: 'contract',
        experience_level: 'any',
        budget_min: '',
        budget_max: '',
        required_skills: [],
        is_remote: false,
        application_deadline: ''
      });
      onSuccess?.();
    } catch (error: any) {
      console.error('Error posting job:', error);
      toast({
        title: "Failed to Post",
        description: error.message || "Something went wrong",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Post a Job
          </DialogTitle>
          <div className="flex items-center gap-2 pt-2">
            <AIWritingAssistant
              text={formData.description}
              onApply={(text) => handleInputChange('description', text)}
              context="job"
              variant="button"
            />
            <span className="text-xs text-muted-foreground">Let AI help you write</span>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Job Title *</label>
            <Input
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="e.g., Need a Logo Designer, Website Developer Wanted"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Description *</label>
              <AIWritingAssistant
                text={formData.description}
                onApply={(text) => handleInputChange('description', text)}
                context="job"
                variant="icon"
              />
            </div>
            <Textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe what you need done, requirements, deliverables..."
              className="min-h-[100px]"
              required
            />
          </div>

          {/* Company & Location */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Company/Name</label>
              <Input
                value={formData.company_name}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                placeholder="Your name or company"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Location</label>
              <Select value={formData.location} onValueChange={(v) => handleInputChange('location', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {states.map((state) => (
                    <SelectItem key={state.name} value={state.name}>{state.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Remote Toggle */}
          <div className="flex items-center justify-between py-2">
            <label className="text-sm font-medium">Remote Work Allowed</label>
            <Switch
              checked={formData.is_remote}
              onCheckedChange={(v) => handleInputChange('is_remote', v)}
            />
          </div>

          {/* Job Type & Experience */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Job Type</label>
              <Select value={formData.job_type} onValueChange={(v) => handleInputChange('job_type', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {jobTypes.map((type) => (
                    <SelectItem key={type} value={type} className="capitalize">{type.replace('-', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Experience Level</label>
              <Select value={formData.experience_level} onValueChange={(v) => handleInputChange('experience_level', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {experienceLevels.map((level) => (
                    <SelectItem key={level} value={level} className="capitalize">{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Budget */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              Budget Range (₦)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                value={formData.budget_min}
                onChange={(e) => handleInputChange('budget_min', e.target.value)}
                placeholder="Min"
                min="0"
              />
              <Input
                type="number"
                value={formData.budget_max}
                onChange={(e) => handleInputChange('budget_max', e.target.value)}
                placeholder="Max"
                min="0"
              />
            </div>
          </div>

          {/* Skills */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Required Skills</label>
            <div className="flex gap-2">
              <Input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                placeholder="Add a skill"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              />
              <Button type="button" variant="outline" size="icon" onClick={addSkill}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.required_skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {formData.required_skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="gap-1">
                    {skill}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeSkill(skill)} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Deadline */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Application Deadline
            </label>
            <Input
              type="date"
              value={formData.application_deadline}
              onChange={(e) => handleInputChange('application_deadline', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Posting...
              </>
            ) : (
              'Post Job'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
