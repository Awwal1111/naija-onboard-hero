import { useState } from "react";
import { Plus, X, Sparkles } from "lucide-react";
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
import { AIWritingAssistant } from "@/components/AIWritingAssistant";

interface EnhancedCourseDialogProps {
  trigger: React.ReactNode;
}

export default function EnhancedCourseDialog({ trigger }: EnhancedCourseDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    course_urls: "",
    thumbnail_url: "",
    duration_hours: "",
    level: "beginner" as "beginner" | "intermediate" | "advanced",
    course_category: "",
    prerequisites: "",
    target_audience: "",
    instructor_name: "",
    instructor_bio: "",
    instructor_credentials: "",
    language: "English",
    certificate_included: false,
    lifetime_access: true,
    money_back_guarantee: false,
    learning_objectives: [{ item: "" }],
    curriculum: [{ title: "", description: "" }],
    materials_included: [{ item: "" }],
  });

  const createCourseMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (!data.title || !data.price || !data.course_urls) {
        throw new Error("Please fill in all required fields");
      }

      const urls = data.course_urls.split("\n").filter(u => u.trim()).map(u => ({ url: u.trim() }));
      const objectives = data.learning_objectives.filter(o => o.item).map(o => o.item);
      const curriculumList = data.curriculum.filter(c => c.title);
      const materials = data.materials_included.filter(m => m.item).map(m => m.item);

      const { error } = await supabase.from("courses").insert({
        user_id: user.id,
        title: data.title,
        description: data.description,
        price: parseFloat(data.price),
        course_urls: urls,
        thumbnail_url: data.thumbnail_url || null,
        duration_hours: data.duration_hours ? parseInt(data.duration_hours) : null,
        level: data.level,
        course_category: data.course_category || null,
        prerequisites: data.prerequisites || null,
        target_audience: data.target_audience || null,
        instructor_name: data.instructor_name || null,
        instructor_bio: data.instructor_bio || null,
        instructor_credentials: data.instructor_credentials || null,
        language: data.language,
        certificate_included: data.certificate_included,
        lifetime_access: data.lifetime_access,
        money_back_guarantee: data.money_back_guarantee,
        learning_objectives: objectives,
        curriculum: curriculumList,
        materials_included: materials,
        status: "active",
      } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Course created successfully!" });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      setOpen(false);
      setFormData({
        title: "",
        description: "",
        price: "",
        course_urls: "",
        thumbnail_url: "",
        duration_hours: "",
        level: "beginner",
        course_category: "",
        prerequisites: "",
        target_audience: "",
        instructor_name: "",
        instructor_bio: "",
        instructor_credentials: "",
        language: "English",
        certificate_included: false,
        lifetime_access: true,
        money_back_guarantee: false,
        learning_objectives: [{ item: "" }],
        curriculum: [{ title: "", description: "" }],
        materials_included: [{ item: "" }],
      });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to create course", variant: "destructive" });
    },
  });

  const addObjective = () => {
    setFormData({ ...formData, learning_objectives: [...formData.learning_objectives, { item: "" }] });
  };

  const removeObjective = (index: number) => {
    setFormData({
      ...formData,
      learning_objectives: formData.learning_objectives.filter((_, i) => i !== index),
    });
  };

  const updateObjective = (index: number, value: string) => {
    const updated = [...formData.learning_objectives];
    updated[index].item = value;
    setFormData({ ...formData, learning_objectives: updated });
  };

  const addCurriculumItem = () => {
    setFormData({ ...formData, curriculum: [...formData.curriculum, { title: "", description: "" }] });
  };

  const removeCurriculumItem = (index: number) => {
    setFormData({
      ...formData,
      curriculum: formData.curriculum.filter((_, i) => i !== index),
    });
  };

  const updateCurriculumItem = (index: number, field: "title" | "description", value: string) => {
    const updated = [...formData.curriculum];
    updated[index][field] = value;
    setFormData({ ...formData, curriculum: updated });
  };

  const addMaterial = () => {
    setFormData({ ...formData, materials_included: [...formData.materials_included, { item: "" }] });
  };

  const removeMaterial = (index: number) => {
    setFormData({
      ...formData,
      materials_included: formData.materials_included.filter((_, i) => i !== index),
    });
  };

  const updateMaterial = (index: number, value: string) => {
    const updated = [...formData.materials_included];
    updated[index].item = value;
    setFormData({ ...formData, materials_included: updated });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create Course</DialogTitle>
          <div className="flex items-center gap-2 pt-2">
            <AIWritingAssistant
              text={formData.description}
              onApply={(text) => setFormData({ ...formData, description: text })}
              context="course"
              contextData={{ profession: formData.course_category }}
              variant="button"
            />
            <span className="text-xs text-muted-foreground">Let AI help you write compelling content</span>
          </div>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Basic Information */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="font-semibold">Basic Information</h3>
            
            <div className="space-y-2">
              <Label>Course Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Complete Web Development Bootcamp"
                maxLength={100}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Price (₦NC) *</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Level</Label>
                <Select value={formData.level} onValueChange={(v: any) => setFormData({ ...formData, level: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border z-50">
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duration (hours)</Label>
                <Input
                  type="number"
                  value={formData.duration_hours}
                  onChange={(e) => setFormData({ ...formData, duration_hours: e.target.value })}
                  placeholder="0"
                  min="1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={formData.course_category}
                  onChange={(e) => setFormData({ ...formData, course_category: e.target.value })}
                  placeholder="e.g., Web Development, Design"
                />
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Input
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  placeholder="English"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Short Description</Label>
                <AIWritingAssistant
                  text={formData.description}
                  onApply={(text) => setFormData({ ...formData, description: text })}
                  context="course"
                  contextData={{ profession: formData.course_category }}
                  variant="icon"
                />
              </div>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief overview (shown in listings)"
                rows={2}
                maxLength={200}
              />
            </div>
          </div>

          {/* Course Content */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="font-semibold">Course Content</h3>
            
            <div className="space-y-2">
              <Label>Video URLs (one per line) *</Label>
              <Textarea
                value={formData.course_urls}
                onChange={(e) => setFormData({ ...formData, course_urls: e.target.value })}
                placeholder="https://video1.com&#10;https://video2.com"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Curriculum Sections</Label>
              {formData.curriculum.map((item, index) => (
                <div key={index} className="space-y-2 p-3 border rounded">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Section title (e.g., Module 1: Introduction)"
                      value={item.title}
                      onChange={(e) => updateCurriculumItem(index, "title", e.target.value)}
                      className="flex-1"
                    />
                    {formData.curriculum.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeCurriculumItem(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Textarea
                    placeholder="Section description"
                    value={item.description}
                    onChange={(e) => updateCurriculumItem(index, "description", e.target.value)}
                    rows={2}
                  />
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addCurriculumItem} className="w-full">
                <Plus className="h-4 w-4 mr-1" />
                Add Curriculum Section
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Learning Objectives</Label>
              {formData.learning_objectives.map((obj, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="What will students learn?"
                    value={obj.item}
                    onChange={(e) => updateObjective(index, e.target.value)}
                    className="flex-1"
                  />
                  {formData.learning_objectives.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeObjective(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addObjective} className="w-full">
                <Plus className="h-4 w-4 mr-1" />
                Add Learning Objective
              </Button>
            </div>
          </div>

          {/* Student Requirements */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="font-semibold">Student Requirements</h3>
            
            <div className="space-y-2">
              <Label>Prerequisites</Label>
              <Textarea
                value={formData.prerequisites}
                onChange={(e) => setFormData({ ...formData, prerequisites: e.target.value })}
                placeholder="What students should know before taking this course"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Target Audience</Label>
              <Textarea
                value={formData.target_audience}
                onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                placeholder="Who is this course for?"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Materials Included</Label>
              {formData.materials_included.map((material, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="e.g., Source code, PDFs, Assignments"
                    value={material.item}
                    onChange={(e) => updateMaterial(index, e.target.value)}
                    className="flex-1"
                  />
                  {formData.materials_included.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeMaterial(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addMaterial} className="w-full">
                <Plus className="h-4 w-4 mr-1" />
                Add Material
              </Button>
            </div>
          </div>

          {/* Instructor Info */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="font-semibold">Instructor Information</h3>
            
            <div className="space-y-2">
              <Label>Instructor Name</Label>
              <Input
                value={formData.instructor_name}
                onChange={(e) => setFormData({ ...formData, instructor_name: e.target.value })}
                placeholder="Your name or instructor's name"
              />
            </div>

            <div className="space-y-2">
              <Label>Instructor Bio</Label>
              <Textarea
                value={formData.instructor_bio}
                onChange={(e) => setFormData({ ...formData, instructor_bio: e.target.value })}
                placeholder="Brief introduction and background"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Credentials & Achievements</Label>
              <Textarea
                value={formData.instructor_credentials}
                onChange={(e) => setFormData({ ...formData, instructor_credentials: e.target.value })}
                placeholder="Certifications, awards, notable achievements"
                rows={2}
              />
            </div>
          </div>

          {/* Course Features */}
          <div className="space-y-4">
            <h3 className="font-semibold">Course Features</h3>
            
            <div className="space-y-2">
              <Label>Thumbnail URL</Label>
              <Input
                value={formData.thumbnail_url}
                onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.certificate_included}
                  onCheckedChange={(checked) => setFormData({ ...formData, certificate_included: checked as boolean })}
                />
                <Label>Certificate of Completion</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.lifetime_access}
                  onCheckedChange={(checked) => setFormData({ ...formData, lifetime_access: checked as boolean })}
                />
                <Label>Lifetime Access</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.money_back_guarantee}
                  onCheckedChange={(checked) => setFormData({ ...formData, money_back_guarantee: checked as boolean })}
                />
                <Label>30-Day Money Back Guarantee</Label>
              </div>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={() => createCourseMutation.mutate(formData)}
            disabled={createCourseMutation.isPending || !formData.title || !formData.price || !formData.course_urls}
          >
            {createCourseMutation.isPending ? "Creating..." : "Create Course"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}