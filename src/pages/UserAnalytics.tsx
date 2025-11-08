import { useState } from "react";
import ResponsiveLayout from "@/components/ResponsiveLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Wallet, Briefcase, Target, Eye, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

const UserAnalytics = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");

  const { data: analytics } = useQuery({
    queryKey: ["user-analytics", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_analytics", {
        p_user_id: user!.id,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: earningsData } = useQuery({
    queryKey: ["earnings-chart", user?.id, period],
    queryFn: async () => {
      const startDate = new Date();
      if (period === "week") startDate.setDate(startDate.getDate() - 7);
      else if (period === "month") startDate.setMonth(startDate.getMonth() - 1);
      else startDate.setFullYear(startDate.getFullYear() - 1);

      const { data } = await supabase
        .from("transactions")
        .select("amount, created_at, type")
        .eq("user_id", user!.id)
        .gte("created_at", startDate.toISOString())
        .order("created_at");

      // Group by date
      const grouped = (data || []).reduce((acc: any, curr) => {
        const date = new Date(curr.created_at).toLocaleDateString();
        if (!acc[date]) {
          acc[date] = { date, earnings: 0, spent: 0 };
        }
        if (curr.type === "credit") acc[date].earnings += curr.amount;
        else acc[date].spent += curr.amount;
        return acc;
      }, {});

      return Object.values(grouped);
    },
    enabled: !!user?.id,
  });

  const { data: taskBreakdown } = useQuery({
    queryKey: ["task-breakdown", user?.id],
    queryFn: async () => {
      const { data: social } = await supabase
        .from("social_task_completions")
        .select("id")
        .eq("user_id", user!.id)
        .eq("status", "approved");

      const { data: referral } = await supabase
        .from("referral_task_completions")
        .select("id")
        .eq("user_id", user!.id)
        .eq("status", "completed");

      return [
        { name: "Social Tasks", value: social?.length || 0 },
        { name: "Referral Tasks", value: referral?.length || 0 },
      ];
    },
    enabled: !!user?.id,
  });

  return (
    <ResponsiveLayout>
      <div className="container max-w-7xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            My Analytics
          </h1>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="h-5 w-5 text-green-600" />
                <p className="text-sm font-medium">Total Earnings</p>
              </div>
              <p className="text-2xl font-bold">₦{analytics?.total_earnings || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5 text-blue-600" />
                <p className="text-sm font-medium">Tasks Completed</p>
              </div>
              <p className="text-2xl font-bold">{analytics?.tasks_completed || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="h-5 w-5 text-purple-600" />
                <p className="text-sm font-medium">Jobs Posted</p>
              </div>
              <p className="text-2xl font-bold">{analytics?.jobs_posted || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="h-5 w-5 text-amber-600" />
                <p className="text-sm font-medium">Jobs Applied</p>
              </div>
              <p className="text-2xl font-bold">{analytics?.jobs_applied || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-5 w-5 text-indigo-600" />
                <p className="text-sm font-medium">Profile Views</p>
              </div>
              <p className="text-2xl font-bold">{analytics?.profile_views || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-pink-600" />
                <p className="text-sm font-medium">Connections</p>
              </div>
              <p className="text-2xl font-bold">{analytics?.connections_count || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
          <TabsList>
            <TabsTrigger value="week">7 Days</TabsTrigger>
            <TabsTrigger value="month">30 Days</TabsTrigger>
            <TabsTrigger value="year">1 Year</TabsTrigger>
          </TabsList>

          <TabsContent value={period} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Earnings & Spending Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={earningsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="earnings" stroke="#10b981" name="Earnings" />
                    <Line type="monotone" dataKey="spent" stroke="#ef4444" name="Spent" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Task Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={taskBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {taskBreakdown?.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Activity Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Posts Created</span>
                    <Badge>{analytics?.posts_created || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Referrals</span>
                    <Badge>{analytics?.referrals_count || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Spent</span>
                    <Badge variant="destructive">₦{analytics?.total_spent || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Net Earnings</span>
                    <Badge className="bg-green-600">
                      ₦{(analytics?.total_earnings || 0) - (analytics?.total_spent || 0)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ResponsiveLayout>
  );
};

export default UserAnalytics;
