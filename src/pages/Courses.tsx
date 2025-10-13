import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Search, Video, Star, Clock, Users, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function Courses() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState<any>({
    title: "",
    description: "",
    price: "",
    course_urls: "",
    thumbnail_url: "",
    duration_hours: "",
    level: "beginner",
  });

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select(`
          *,
          profiles!courses_user_id_fkey(full_name, profile_picture_url)
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const createCourseMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const urls = data.course_urls.split("\n").filter(u => u.trim()).map(u => ({ url: u.trim() }));

      const { error } = await supabase.from("courses").insert({
        user_id: user.id,
        title: data.title,
        description: data.description,
        price: parseFloat(data.price),
        course_urls: urls,
        thumbnail_url: data.thumbnail_url,
        duration_hours: data.duration_hours ? parseInt(data.duration_hours) : null,
        level: data.level,
        status: "active",
      } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Course created successfully!" });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      setCreateDialogOpen(false);
      setFormData({ title: "", description: "", price: "", course_urls: "", thumbnail_url: "", duration_hours: "", level: "beginner" });
    },
    onError: () => {
      toast({ title: "Failed to create course", variant: "destructive" });
    },
  });

  const enrollMutation = useMutation({
    mutationFn: async ({ courseId, price }: { courseId: string; price: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: existing } = await supabase
        .from("course_enrollments")
        .select("id")
        .eq("course_id", courseId)
        .eq("student_id", user.id)
        .single();

      if (existing) {
        throw new Error("You are already enrolled in this course");
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("wallet_balance")
        .eq("user_id", user.id)
        .single();

      if (!profile || profile.wallet_balance < price) {
        throw new Error("Insufficient balance");
      }

      await supabase
        .from("profiles")
        .update({ wallet_balance: profile.wallet_balance - price })
        .eq("user_id", user.id);

      await supabase.from("course_enrollments").insert({
        course_id: courseId,
        student_id: user.id,
        amount: price,
      });
    },
    onSuccess: () => {
      toast({ title: "Enrollment successful! You can now access the course." });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Enrollment failed", variant: "destructive" });
    },
  });

  const filteredCourses = courses.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-bold">Courses</h1>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Create
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Course</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Course title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your course"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Price (₦NC)</Label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Course URLs (one per line)</Label>
                  <Textarea
                    value={formData.course_urls}
                    onChange={(e) => setFormData({ ...formData, course_urls: e.target.value })}
                    placeholder="https://video1.com&#10;https://video2.com"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration (hours)</Label>
                  <Input
                    type="number"
                    value={formData.duration_hours || ""}
                    onChange={(e) => setFormData({ ...formData, duration_hours: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Level</Label>
                  <Select 
                    value={formData.level || "beginner"} 
                    onValueChange={(v) => setFormData({ ...formData, level: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Thumbnail URL (Optional)</Label>
                  <Input
                    value={formData.thumbnail_url}
                    onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => createCourseMutation.mutate(formData)}
                  disabled={createCourseMutation.isPending}
                >
                  Create Course
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="p-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No courses found</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredCourses.map((course: any) => (
              <Card key={course.id}>
                <CardHeader className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="w-fit">
                      <Video className="h-3 w-3 mr-1" />
                      {course.course_urls?.length || 0} Videos
                    </Badge>
                    {course.level && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {course.level}
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm">{course.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{course.description}</p>
                  {course.average_rating > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        <span className="text-xs font-semibold">{course.average_rating.toFixed(1)}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">({course.review_count} reviews)</span>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">₦{course.price}NC</span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{course.enrollment_count} students</span>
                    </div>
                  </div>
                  {course.duration_hours && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{course.duration_hours} hours of content</span>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="p-3 pt-0">
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => enrollMutation.mutate({ courseId: course.id, price: course.price })}
                    disabled={enrollMutation.isPending}
                  >
                    <Award className="h-4 w-4 mr-1" />
                    Enroll Now
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
