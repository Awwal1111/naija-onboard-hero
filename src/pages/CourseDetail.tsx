import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Star, Users, Clock, Award, CheckCircle, PlayCircle } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [enrollOpen, setEnrollOpen] = useState(false);

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select(`
          *,
          profiles:user_id (full_name, profile_picture_url)
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: isEnrolled } = useQuery({
    queryKey: ["is-enrolled", id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("course_enrollments")
        .select("id")
        .eq("course_id", id)
        .eq("student_id", user.id)
        .single();
      return !!data;
    },
    enabled: !!user,
  });

  const { data: progress } = useQuery({
    queryKey: ["course-progress", id],
    queryFn: async () => {
      if (!user || !isEnrolled) return null;
      const { data } = await supabase
        .from("course_progress")
        .select("*")
        .eq("course_id", id)
        .eq("student_id", user.id)
        .single();
      return data;
    },
    enabled: !!user && !!isEnrolled,
  });

  const { data: reviews } = useQuery({
    queryKey: ["course-reviews", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_reviews")
        .select(`
          *,
          profiles:student_id (full_name, profile_picture_url)
        `)
        .eq("course_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please log in to enroll");
      
      if (course?.is_demo) {
        throw new Error("This is a demo course and cannot be purchased. Only real courses can be enrolled in.");
      }

      // Check balance
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance_withdrawable")
        .eq("user_id", user.id)
        .single();

      if (!profile || profile.balance_withdrawable < course.price) {
        throw new Error("Insufficient balance");
      }

      // Deduct from student
      await supabase
        .from("profiles")
        .update({
          wallet_balance: profile.balance_withdrawable - course.price,
          balance_withdrawable: profile.balance_withdrawable - course.price,
        })
        .eq("user_id", user.id);

      // Credit instructor
      await supabase.rpc("increment_wallet_balance", {
        target_user_id: course.user_id,
        amount_to_add: course.price,
      });

      // Record enrollment
      await supabase.from("course_enrollments").insert({
        course_id: id,
        student_id: user.id,
        amount: course.price,
      });

      // Create progress record
      await supabase.from("course_progress").insert({
        course_id: id,
        student_id: user.id,
      });

      // Update enrollment count
      await supabase
        .from("courses")
        .update({ enrollment_count: (course.enrollment_count || 0) + 1 })
        .eq("id", id);

      // Log transactions
      await supabase.from("wallet_transactions").insert([
        {
          user_id: user.id,
          kind: "course_enrollment",
          amount: -course.price,
          status: "completed",
          reference: `Enrollment: ${course.title}`,
        },
        {
          user_id: course.user_id,
          kind: "course_sale",
          amount: course.price,
          status: "completed",
          reference: `Course sale: ${course.title}`,
        },
      ]);
    },
    onSuccess: () => {
      toast({
        title: "Enrollment successful!",
        description: "You can now access the course content",
      });
      queryClient.invalidateQueries({ queryKey: ["is-enrolled", id] });
      queryClient.invalidateQueries({ queryKey: ["course", id] });
      setEnrollOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Enrollment failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) return <div className="container mx-auto px-4 py-8">Loading...</div>;
  if (!course) return <div className="container mx-auto px-4 py-8">Course not found</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Button onClick={() => navigate("/courses")} variant="ghost" className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Courses
        </Button>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            {course.thumbnail_url && (
              <img src={course.thumbnail_url} alt={course.title} className="w-full h-96 object-cover rounded-lg" />
            )}

            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
                  <p className="text-xl text-muted-foreground mb-4">{course.description}</p>
                  <div className="flex items-center gap-2">
                    {course.course_category && <Badge variant="outline">{course.course_category}</Badge>}
                    {course.level && <Badge variant="secondary">{course.level}</Badge>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-6">
                {course.average_rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{course.average_rating}</span>
                    <span className="text-muted-foreground">({course.review_count} reviews)</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Users className="w-5 h-5" />
                  <span>{course.enrollment_count || 0} students</span>
                </div>
                {course.duration_hours && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-5 h-5" />
                    <span>{course.duration_hours} hours</span>
                  </div>
                )}
              </div>

              {isEnrolled && progress && (
                <Card className="p-4 mb-6 bg-primary/5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Your Progress</span>
                      <span className="text-sm">{progress.progress_percentage}%</span>
                    </div>
                    <Progress value={progress.progress_percentage} />
                  </div>
                </Card>
              )}

              <p className="text-lg mb-6">{course.description}</p>

              {course.learning_objectives && Array.isArray(course.learning_objectives) && course.learning_objectives.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-3">What You'll Learn</h2>
                  <ul className="grid md:grid-cols-2 gap-2">
                    {course.learning_objectives.map((objective: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span>{objective}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {course.curriculum && Array.isArray(course.curriculum) && course.curriculum.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-3">Course Curriculum</h2>
                  <div className="space-y-3">
                    {course.curriculum.map((section: any, index: number) => (
                      <Card key={index} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1">{section.title}</h3>
                            <p className="text-sm text-muted-foreground">{section.description}</p>
                          </div>
                          {isEnrolled && section.duration && (
                            <span className="text-sm text-muted-foreground ml-4">{section.duration}</span>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {course.prerequisites && (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-3">Prerequisites</h2>
                  <p>{course.prerequisites}</p>
                </div>
              )}

              {course.target_audience && (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-3">Who This Course Is For</h2>
                  <p>{course.target_audience}</p>
                </div>
              )}

              {course.instructor_name && (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-3">About the Instructor</h2>
                  <Card className="p-4">
                    <p className="font-semibold mb-2">{course.instructor_name}</p>
                    {course.instructor_credentials && <p className="text-sm mb-2">{course.instructor_credentials}</p>}
                    {course.instructor_bio && <p className="text-sm text-muted-foreground">{course.instructor_bio}</p>}
                  </Card>
                </div>
              )}

              {reviews && reviews.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-3">Student Reviews</h2>
                  <div className="space-y-4">
                    {reviews.map((review: any) => (
                      <Card key={review.id} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {review.profiles?.profile_picture_url && (
                              <img
                                src={review.profiles.profile_picture_url}
                                alt=""
                                className="w-8 h-8 rounded-full"
                              />
                            )}
                            <span className="font-semibold">{review.profiles?.full_name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span>{review.rating}</span>
                          </div>
                        </div>
                        <p className="text-sm">{review.review_text}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <Card className="p-6 sticky top-6">
              <div className="space-y-4">
                {course.is_demo && (
                  <Badge variant="outline" className="w-full justify-center bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/50">
                    DEMO COURSE - NOT PURCHASABLE
                  </Badge>
                )}
                <div className="text-3xl font-bold">₦{course.price?.toLocaleString()}NC</div>

                {isEnrolled ? (
                  <Button className="w-full" size="lg">
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Continue Learning
                  </Button>
                ) : course.is_demo ? (
                  <Button className="w-full" size="lg" variant="outline" disabled>
                    Demo Course - Not Purchasable
                  </Button>
                ) : (
                  <Button onClick={() => setEnrollOpen(true)} className="w-full" size="lg">
                    Enroll Now
                  </Button>
                )}

                <Separator />

                <div className="space-y-2 text-sm">
                  <h3 className="font-semibold">This course includes:</h3>
                  {course.lifetime_access && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>Lifetime access</span>
                    </div>
                  )}
                  {course.certificate_included && (
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      <span>Certificate of completion</span>
                    </div>
                  )}
                  {course.duration_hours && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{course.duration_hours} hours of content</span>
                    </div>
                  )}
                  {course.language && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>Language: {course.language}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Enrollment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>You are about to enroll in:</p>
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-semibold">{course.title}</p>
              <p className="text-2xl font-bold mt-2">₦{course.price?.toLocaleString()}NC</p>
            </div>
            <p className="text-sm text-muted-foreground">
              This amount will be deducted from your wallet balance.
            </p>
            <Button
              onClick={() => enrollMutation.mutate()}
              disabled={enrollMutation.isPending}
              className="w-full"
            >
              {enrollMutation.isPending ? "Processing..." : "Confirm Enrollment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
