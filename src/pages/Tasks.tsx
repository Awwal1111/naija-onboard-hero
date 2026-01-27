import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, ListTodo, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskCard } from "@/components/TaskCard";
import { CreateTaskDialog } from "@/components/CreateTaskDialog";
import { MyTasksManager } from "@/components/MyTasksManager";
import { useTasks } from "@/hooks/useTasks";

export default function Tasks() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"highest" | "lowest">("highest");
  const [activeTab, setActiveTab] = useState<"browse" | "my-tasks">("browse");
  
  const { 
    tasks, 
    myTasks,
    myTaskSubmissions,
    loading, 
    createTask,
    submitTask, 
    approveSubmission,
    rejectSubmission,
    hasSubmitted, 
    getSubmissionStatus, 
    getAdminComment,
    startChatWithCreator
  } = useTasks();

  const filteredTasks = tasks
    .filter((task) => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const submissionStatus = getSubmissionStatus(task.id);
      const matchesStatus = 
        statusFilter === "all" ||
        (statusFilter === "available" && !hasSubmitted(task.id)) ||
        (statusFilter === "pending" && submissionStatus === "pending") ||
        (statusFilter === "approved" && submissionStatus === "approved") ||
        (statusFilter === "rejected" && submissionStatus === "rejected");
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "highest") {
        return b.reward - a.reward;
      }
      return a.reward - b.reward;
    });

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b px-2 sm:px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-base sm:text-lg font-bold">Tasks</h1>
          </div>
          <CreateTaskDialog onCreateTask={createTask} />
        </div>
      </div>

      <div className="p-2 sm:p-3 space-y-3">
        {/* Tab Switcher */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "browse" | "my-tasks")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="browse" className="gap-2">
              <ListTodo className="h-4 w-4" />
              Browse Tasks
            </TabsTrigger>
            <TabsTrigger value="my-tasks" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              My Tasks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-3 mt-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Tabs value={statusFilter} onValueChange={setStatusFilter} className="flex-1">
                <TabsList className="grid w-full grid-cols-5 h-9">
                  <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                  <TabsTrigger value="available" className="text-xs">Available</TabsTrigger>
                  <TabsTrigger value="pending" className="text-xs">Pending</TabsTrigger>
                  <TabsTrigger value="approved" className="text-xs">Approved</TabsTrigger>
                  <TabsTrigger value="rejected" className="text-xs">Rejected</TabsTrigger>
                </TabsList>
              </Tabs>

              <Select value={sortBy} onValueChange={(value: "highest" | "lowest") => setSortBy(value)}>
                <SelectTrigger className="w-full sm:w-[180px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="highest">Highest Reward</SelectItem>
                  <SelectItem value="lowest">Lowest Reward</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tasks List */}
            {loading ? (
              <div className="text-center py-8 text-sm">Loading...</div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">No tasks found</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    hasSubmitted={hasSubmitted(task.id)}
                    submissionStatus={getSubmissionStatus(task.id)}
                    adminComment={getAdminComment(task.id)}
                    onSubmit={submitTask}
                    onChatWithCreator={startChatWithCreator}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-tasks" className="mt-3">
            <MyTasksManager
              tasks={myTasks}
              submissions={myTaskSubmissions}
              onApprove={approveSubmission}
              onReject={rejectSubmission}
              onChatWithSubmitter={startChatWithCreator}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
