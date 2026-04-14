import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Search, Video, Star, Clock, Users, Award, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import EnhancedCourseDialog from "@/components/EnhancedCourseDialog";
import { usePersonalizedCourses } from "@/hooks/usePersonalizedDiscovery";
import { BookmarkButton } from "@/components/BookmarkButton";
import { formatPriceForDisplay } from "@/components/CurrencyDisplay";
import { useUserCountry } from "@/hooks/useUserCountry";

export default function Courses() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("discover");
  const [myCourses, setMyCourses] = useState<any[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [stats, setStats] = useState({ created: 0, enrolled: 0, revenue: 0, students: 0 });

  const { courses, loading: isLoading } = usePersonalizedCourses(50);
  const { isNigerian } = useUserCountry();

  useEffect(() => {
    if (user) fetchMyData();
  }, [user]);

  const fetchMyData = async () => {
    const [createdRes, enrolledRes, enrollmentsRes] = await Promise.all([
      supabase.from('courses').select('*').eq('user_id', user?.id).order('created_at', { ascending: false }),
      supabase.from('course_enrollments').select('*, courses(*)').eq('student_id', user?.id),
      supabase.from('course_enrollments').select('amount, courses!inner(user_id)').eq('courses.user_id', user?.id)
    ]);
    setMyCourses(createdRes.data || []);
    setEnrolledCourses(enrolledRes.data || []);
    setStats({
      created: createdRes.data?.length || 0,
      enrolled: enrolledRes.data?.length || 0,
      revenue: (enrollmentsRes.data || []).reduce((sum, e) => sum + (e.amount || 0), 0),
      students: enrollmentsRes.data?.length || 0
    });
  };

  const enrollMutation = useMutation({
    mutationFn: async ({ courseId, price, isDemo }: { courseId: string; price: number; isDemo: boolean }) => {
      if (isDemo) throw new Error("Demo courses cannot be purchased");
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Not authenticated");

      const { data: existing } = await supabase.from("course_enrollments").select("id").eq("course_id", courseId).eq("student_id", authUser.id).single();
      if (existing) throw new Error("Already enrolled");

      const { data: profile } = await supabase.from("profiles").select("wallet_balance").eq("user_id", authUser.id).single();
      if (!profile || profile.wallet_balance < price) throw new Error("Insufficient balance");

      await supabase.from("profiles").update({ wallet_balance: profile.wallet_balance - price }).eq("user_id", authUser.id);
      await supabase.from("course_enrollments").insert({ course_id: courseId, student_id: authUser.id, amount: price });
    },
    onSuccess: () => {
      toast({ title: "Enrolled successfully!" });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      fetchMyData();
    },
    onError: (error: any) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const filteredCourses = courses.filter((c: any) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const CourseCard = ({ course, showEnroll = true }: { course: any; showEnroll?: boolean }) => (
    <Card className={course.is_demo ? "border-yellow-500/50 bg-yellow-50/10" : ""}>
      {course.thumbnail_url && (
        <div className="h-32 bg-muted rounded-t-lg overflow-hidden">
          <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
        </div>
      )}
      <CardHeader className="p-3 pb-1">
        <div className="flex items-center gap-2 mb-1">
          {course.is_demo && <Badge variant="outline" className="text-yellow-600 border-yellow-500/50 text-xs">DEMO</Badge>}
          <Badge className="text-xs"><Video className="h-3 w-3 mr-1" />{course.course_urls?.length || 0}</Badge>
          {course.level && <Badge variant="outline" className="text-xs capitalize">{course.level}</Badge>}
        </div>
        <h3 className="font-semibold text-sm line-clamp-2">{course.title}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2">{course.description}</p>
      </CardHeader>
      <CardContent className="p-3 pt-1 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-primary">{formatPriceForDisplay(course.price, isNigerian)}</span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <BookmarkButton type="course" itemId={course.id} />
            {course.average_rating > 0 && (
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                {course.average_rating.toFixed(1)}
              </span>
            )}
            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{course.enrollment_count || 0}</span>
          </div>
        </div>
      </CardContent>
      {showEnroll && (
        <CardFooter className="p-3 pt-0">
          <Button
            size="sm"
            className="w-full"
            variant={course.is_demo ? "outline" : "default"}
            disabled={course.is_demo || enrollMutation.isPending}
            onClick={() => enrollMutation.mutate({ courseId: course.id, price: course.price, isDemo: course.is_demo })}
          >
            {course.is_demo ? "Demo - Not Purchasable" : <><Award className="h-4 w-4 mr-1" />Enroll Now</>}
          </Button>
        </CardFooter>
      )}
    </Card>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-bold flex-1">Courses</h1>
          <EnhancedCourseDialog trigger={<Button size="sm" className="gap-1"><Plus className="h-4 w-4" />Create</Button>} />
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 p-4">
          <Card className="bg-orange-500/10 border-orange-500/20">
            <CardContent className="pt-3 pb-3 text-center">
              <div className="text-lg font-bold text-orange-600">{stats.created}</div>
              <div className="text-[10px] text-muted-foreground">Created</div>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardContent className="pt-3 pb-3 text-center">
              <div className="text-lg font-bold text-blue-600">{stats.enrolled}</div>
              <div className="text-[10px] text-muted-foreground">Enrolled</div>
            </CardContent>
          </Card>
          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="pt-3 pb-3 text-center">
              <div className="text-lg font-bold text-green-600">{formatPriceForDisplay(stats.revenue, isNigerian)}</div>
              <div className="text-[10px] text-muted-foreground">Revenue</div>
            </CardContent>
          </Card>
          <Card className="bg-purple-500/10 border-purple-500/20">
            <CardContent className="pt-3 pb-3 text-center">
              <div className="text-lg font-bold text-purple-600">{stats.students}</div>
              <div className="text-[10px] text-muted-foreground">Students</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="my-courses">My Courses</TabsTrigger>
            <TabsTrigger value="enrolled">Enrolled</TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="mt-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search courses..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            {isLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : filteredCourses.length === 0 ? (
              <Card><CardContent className="py-12 text-center"><GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><h3 className="font-semibold">No courses found</h3></CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
                {filteredCourses.map((course: any) => <CourseCard key={course.id} course={course} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-courses" className="mt-4 space-y-4">
            {myCourses.length === 0 ? (
              <Card><CardContent className="py-12 text-center"><GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><h3 className="font-semibold mb-2">No Courses Created</h3><p className="text-sm text-muted-foreground mb-4">Create your first course and start earning</p><EnhancedCourseDialog trigger={<Button><Plus className="h-4 w-4 mr-1" />Create Course</Button>} /></CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
                {myCourses.map((course) => (
                  <Card key={course.id}>
                    <CardContent className="pt-4">
                      <h3 className="font-semibold mb-1">{course.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{course.description}</p>
                      <div className="flex items-center justify-between text-xs">
                        <Badge variant={course.status === 'active' ? 'default' : 'secondary'}>{course.status}</Badge>
                        <span className="text-muted-foreground"><Users className="h-3 w-3 inline mr-1" />{course.enrollment_count || 0} students</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="enrolled" className="mt-4 space-y-4">
            {enrolledCourses.length === 0 ? (
              <Card><CardContent className="py-12 text-center"><Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><h3 className="font-semibold mb-2">No Enrolled Courses</h3><p className="text-sm text-muted-foreground">Browse courses and enroll to start learning</p></CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
                {enrolledCourses.map((enrollment) => (
                  <Card key={enrollment.id}>
                    <CardContent className="pt-4">
                      <h3 className="font-semibold mb-1">{enrollment.courses?.title}</h3>
                      <p className="text-xs text-muted-foreground mb-3">Enrolled {new Date(enrollment.created_at).toLocaleDateString()}</p>
                      <Button size="sm" className="w-full" onClick={() => navigate(`/courses/${enrollment.course_id}`)}>Continue Learning</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
