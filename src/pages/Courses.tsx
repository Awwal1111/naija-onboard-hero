import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Search, Video, Star, Clock, Users, Award, TrendingUp } from "lucide-react";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import EnhancedCourseDialog from "@/components/EnhancedCourseDialog";
import { usePersonalizedCourses } from "@/hooks/usePersonalizedDiscovery";

export default function Courses() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  // Use personalized courses algorithm
  const { courses, loading: isLoading } = usePersonalizedCourses(50);

  const enrollMutation = useMutation({
    mutationFn: async ({ courseId, price, isDemo }: { courseId: string; price: number; isDemo: boolean }) => {
      if (isDemo) {
        throw new Error("This is a demo course and cannot be purchased. Only real courses can be enrolled in.");
      }

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
          <EnhancedCourseDialog
            trigger={
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Create
              </Button>
            }
          />
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
              <Card key={course.id} className={course.is_demo ? "border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20" : ""}>
                <CardHeader className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    {course.is_demo && (
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/50">
                        DEMO
                      </Badge>
                    )}
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
                  {course.is_demo ? (
                    <Button
                      size="sm"
                      className="w-full"
                      variant="outline"
                      disabled
                    >
                      Demo Course - Not Purchasable
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => enrollMutation.mutate({ courseId: course.id, price: course.price, isDemo: course.is_demo })}
                      disabled={enrollMutation.isPending}
                    >
                      <Award className="h-4 w-4 mr-1" />
                      Enroll Now
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
