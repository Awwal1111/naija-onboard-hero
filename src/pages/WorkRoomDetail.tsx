import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ResponsiveLayout from "@/components/ResponsiveLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useWorkrooms, WorkroomTask, WorkroomFile, WorkroomComment, WorkroomMember } from "@/hooks/useWorkrooms";
import { useWorkDiary } from "@/hooks/useWorkDiary";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Plus, Users, FileText, MessageSquare, Clock, CheckCircle2, Circle, Loader2, Upload, Timer, Play, Square, DollarSign, UserPlus, AlertCircle, Wallet } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const WorkRoomDetail = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    workrooms, 
    loading,
    createTask,
    updateTask,
    getTasks,
    uploadFile,
    getFiles,
    addComment,
    getComments,
    getWorkroomMembers,
    completeWorkroom
  } = useWorkrooms();

  const {
    activeEntry,
    formattedTime,
    startTimer,
    stopTimer,
    getPendingApprovals,
    payForEntries
  } = useWorkDiary();

  const [tasks, setTasks] = useState<WorkroomTask[]>([]);
  const [files, setFiles] = useState<WorkroomFile[]>([]);
  const [comments, setComments] = useState<WorkroomComment[]>([]);
  const [members, setMembers] = useState<WorkroomMember[]>([]);
  const [pendingTime, setPendingTime] = useState<any[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [newTaskDialogOpen, setNewTaskDialogOpen] = useState(false);
  const [newComment, setNewComment] = useState("");

  const workroom = workrooms.find(w => w.id === roomId);
  const isOwner = workroom?.owner_id === user?.id;
  const isMember = members.some(m => m.user_id === user?.id);
  const myMember = members.find(m => m.user_id === user?.id);
  const isTimerRunningHere = activeEntry?.workroom_id === roomId;

  useEffect(() => {
    if (roomId) {
      loadData();
    }
  }, [roomId]);

  const loadData = async () => {
    if (!roomId) return;
    const [tasksData, filesData, commentsData, membersData] = await Promise.all([
      getTasks(roomId),
      getFiles(roomId),
      getComments(roomId),
      getWorkroomMembers(roomId)
    ]);
    setTasks(tasksData);
    setFiles(filesData);
    setComments(commentsData);
    setMembers(membersData);

    // Load pending time approvals for owner
    if (workroom?.owner_id === user?.id) {
      const pending = await getPendingApprovals(roomId);
      setPendingTime(pending);
    }
  };

  const todoTasks = tasks.filter(t => t.status === 'todo');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const doneTasks = tasks.filter(t => t.status === 'done');

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim() || !roomId) return;
    
    await createTask(roomId, {
      title: newTaskTitle,
      description: newTaskDescription,
      priority: newTaskPriority,
      assigned_to: newTaskAssignee || undefined
    });
    
    setNewTaskTitle("");
    setNewTaskDescription("");
    setNewTaskPriority("medium");
    setNewTaskAssignee("");
    setNewTaskDialogOpen(false);
    loadData();
    toast.success("Task created!");
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    await updateTask(taskId, { status: newStatus as WorkroomTask['status'] });
    loadData();
    toast.success("Task updated!");
  };

  const handleStartTimer = async () => {
    if (!roomId) return;
    await startTimer({
      workroomId: roomId,
      hourlyRate: myMember?.hourly_rate || workroom?.hourly_rate,
      description: "Working on " + workroom?.name
    });
  };

  const handleStopTimer = async () => {
    await stopTimer();
    loadData();
  };

  const handleCompleteProject = async () => {
    if (!roomId) return;
    if (confirm("Are you sure you want to mark this project as complete?")) {
      await completeWorkroom(roomId);
    }
  };


  const handleAddComment = async () => {
    if (!newComment.trim() || !roomId) return;
    
    await addComment(roomId, newComment);
    setNewComment("");
    loadData();
    toast.success("Comment added!");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !roomId) return;
    
    // In production, upload to storage and get URL
    const fakeUrl = URL.createObjectURL(file);
    await uploadFile(roomId, {
      file_name: file.name,
      file_url: fakeUrl,
      file_type: file.type,
      file_size: file.size
    });
    loadData();
    toast.success("File uploaded!");
  };

  const priorityColors = {
    low: "bg-green-500/10 text-green-600 dark:text-green-400",
    medium: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    high: "bg-red-500/10 text-red-600 dark:text-red-400",
    urgent: "bg-red-500/10 text-red-600 dark:text-red-400"
  };

  const TaskCard = ({ task }: { task: WorkroomTask }) => (
    <Card className="mb-2 cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{task.title}</p>
            {task.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{task.description}</p>
            )}
          </div>
          <Badge className={`text-xs shrink-0 ${priorityColors[task.priority]}`}>
            {task.priority}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Select value={task.status} onValueChange={(v) => handleStatusChange(task.id, v)}>
            <SelectTrigger className="h-7 text-xs w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
          {task.due_date && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(task.due_date), 'MMM d')}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const KanbanColumn = ({ title, columnTasks, icon: Icon, color }: { title: string; columnTasks: WorkroomTask[]; icon: any; color: string }) => (
    <div className="flex-1 min-w-[280px]">
      <div className={`flex items-center gap-2 mb-3 p-2 rounded-lg ${color}`}>
        <Icon className="h-4 w-4" />
        <span className="font-medium text-sm">{title}</span>
        <Badge variant="secondary" className="ml-auto">{columnTasks.length}</Badge>
      </div>
      <ScrollArea className="h-[calc(100vh-380px)]">
        <div className="space-y-2 pr-2">
          {columnTasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
          {columnTasks.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No tasks</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  if (loading) {
    return (
      <ResponsiveLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ResponsiveLayout>
    );
  }

  if (!workroom) {
    return (
      <ResponsiveLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">WorkRoom not found</p>
          <Button variant="link" onClick={() => navigate('/workrooms')}>
            Back to WorkRooms
          </Button>
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/workrooms')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{workroom.name}</h1>
            <p className="text-sm text-muted-foreground">{workroom.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={workroom.status === 'active' ? 'default' : 'secondary'}>
              {workroom.status}
            </Badge>
            {workroom.payment_type === 'hourly' && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <DollarSign className="h-3 w-3 mr-1" />
                NC {workroom.hourly_rate}/hr
              </Badge>
            )}
          </div>
        </div>

        {/* Timer Card for Freelancers */}
        {isMember && workroom.payment_type === 'hourly' && workroom.status === 'active' && (
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Timer className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Time Tracking</p>
                    <p className="text-sm text-muted-foreground">
                      {isTimerRunningHere ? 'Timer running...' : 'Start tracking your work'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isTimerRunningHere && (
                    <span className="text-2xl font-mono font-bold text-primary">{formattedTime}</span>
                  )}
                  {!activeEntry ? (
                    <Button onClick={handleStartTimer}>
                      <Play className="h-4 w-4 mr-1" />
                      Start Timer
                    </Button>
                  ) : isTimerRunningHere ? (
                    <Button variant="destructive" onClick={handleStopTimer}>
                      <Square className="h-4 w-4 mr-1" />
                      Stop
                    </Button>
                  ) : (
                    <Button disabled variant="outline">
                      Timer running elsewhere
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Time Approvals for Owner */}
        {isOwner && pendingTime.length > 0 && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{pendingTime.length} pending time entries need approval</span>
              <Button size="sm" variant="outline" onClick={() => navigate('/work-diary')}>
                Review Time
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Team Members */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team ({members.length})
              </CardTitle>
              {isOwner && workroom.status === 'active' && (
                <Button size="sm" variant="outline" onClick={handleCompleteProject}>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Complete Project
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {members.map(member => (
                <div key={member.id} className="flex items-center gap-2 bg-muted rounded-full pl-1 pr-3 py-1">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={member.user_avatar} />
                    <AvatarFallback className="text-xs">{member.user_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{member.user_name}</span>
                  <Badge variant="outline" className="text-xs">{member.role}</Badge>
                  {member.hourly_rate && (
                    <span className="text-xs text-muted-foreground">NC {member.hourly_rate}/hr</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="files" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Files
            </TabsTrigger>
            <TabsTrigger value="discussion" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Discussion
            </TabsTrigger>
          </TabsList>

          {/* Tasks Tab - Kanban Board */}
          <TabsContent value="tasks" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Task Board</h2>
              <Dialog open={newTaskDialogOpen} onOpenChange={setNewTaskDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Task
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                    <DialogDescription>Assign work to team members</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <Input
                      placeholder="Task title"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                    />
                    <Textarea
                      placeholder="Description (optional)"
                      value={newTaskDescription}
                      onChange={(e) => setNewTaskDescription(e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Select value={newTaskPriority} onValueChange={(v: "low" | "medium" | "high") => setNewTaskPriority(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low Priority</SelectItem>
                          <SelectItem value="medium">Medium Priority</SelectItem>
                          <SelectItem value="high">High Priority</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={newTaskAssignee} onValueChange={setNewTaskAssignee}>
                        <SelectTrigger>
                          <SelectValue placeholder="Assign to" />
                        </SelectTrigger>
                        <SelectContent>
                          {members.map(m => (
                            <SelectItem key={m.user_id} value={m.user_id}>
                              {m.user_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleCreateTask} className="w-full">
                      Create Task
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4">
              <KanbanColumn 
                title="To Do" 
                columnTasks={todoTasks} 
                icon={Circle} 
                color="bg-muted"
              />
              <KanbanColumn 
                title="In Progress" 
                columnTasks={inProgressTasks} 
                icon={Loader2} 
                color="bg-blue-500/10"
              />
              <KanbanColumn 
                title="Done" 
                columnTasks={doneTasks} 
                icon={CheckCircle2} 
                color="bg-green-500/10"
              />
            </div>
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Project Files</h2>
              <label>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button size="sm" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-1" />
                    Upload
                  </span>
                </Button>
              </label>
            </div>

            <div className="grid gap-3">
              {files.map(file => (
                <Card key={file.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{file.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {file.file_size ? `${(file.file_size / 1024).toFixed(1)} KB` : 'Unknown size'} • {format(new Date(file.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" asChild>
                      <a href={file.file_url} target="_blank" rel="noopener noreferrer">
                        <FileText className="h-4 w-4" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {files.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No files uploaded yet</p>
              )}
            </div>
          </TabsContent>

          {/* Discussion Tab */}
          <TabsContent value="discussion" className="mt-4">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                />
                <Button onClick={handleAddComment}>Post</Button>
              </div>

              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {comments.map(comment => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.user_avatar} />
                        <AvatarFallback>{comment.user_name?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{comment.user_name || 'Team Member'}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No comments yet. Start the discussion!</p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ResponsiveLayout>
  );
};

export default WorkRoomDetail;
