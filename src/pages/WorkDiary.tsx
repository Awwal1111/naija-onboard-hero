import { useState } from "react";
import ResponsiveLayout from "@/components/ResponsiveLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useWorkDiary } from "@/hooks/useWorkDiary";
import { useWorkrooms } from "@/hooks/useWorkrooms";
import { Play, Pause, Square, Clock, Calendar, Plus, Timer, BarChart3, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";

const WorkDiary = () => {
  const { 
    entries, 
    loading, 
    activeEntry, 
    elapsedTime, 
    formattedTime,
    startTimer, 
    stopTimer, 
    addManualEntry,
    getStats
  } = useWorkDiary();
  const { workrooms } = useWorkrooms();
  
  const [selectedWorkroom, setSelectedWorkroom] = useState<string>("");
  const [timerDescription, setTimerDescription] = useState("");
  
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualHours, setManualHours] = useState("");
  const [manualMinutes, setManualMinutes] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [manualWorkroom, setManualWorkroom] = useState("");
  const [manualDate, setManualDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const handleStartTimer = async () => {
    if (!selectedWorkroom) {
      toast.error("Please select a project first");
      return;
    }
    
    await startTimer({
      workroomId: selectedWorkroom,
      description: timerDescription || "Working..."
    });
  };

  const handleStopTimer = async () => {
    await stopTimer(timerDescription);
    setTimerDescription("");
  };

  const handleManualEntry = async () => {
    const hours = parseInt(manualHours) || 0;
    const minutes = parseInt(manualMinutes) || 0;
    const totalMinutes = hours * 60 + minutes;
    
    if (totalMinutes === 0) {
      toast.error("Please enter a valid duration");
      return;
    }
    
    if (!manualWorkroom) {
      toast.error("Please select a project");
      return;
    }
    
    const entryDate = new Date(manualDate);
    entryDate.setHours(9, 0, 0, 0);
    const endDate = new Date(entryDate.getTime() + totalMinutes * 60000);
    
    await addManualEntry({
      workroomId: manualWorkroom,
      description: manualDescription || "Manual entry",
      startedAt: entryDate.toISOString(),
      endedAt: endDate.toISOString()
    });
    
    setManualDialogOpen(false);
    setManualHours("");
    setManualMinutes("");
    setManualDescription("");
    setManualWorkroom("");
  };

  // Weekly stats
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  const weeklyEntries = entries.filter(e => {
    const entryDate = new Date(e.started_at);
    return entryDate >= weekStart && entryDate <= weekEnd;
  });
  
  const stats = getStats(weeklyEntries);

  const getDayMinutes = (day: Date) => {
    return entries
      .filter(e => isSameDay(new Date(e.started_at), day))
      .reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
  };

  if (loading) {
    return (
      <ResponsiveLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Work Diary</h1>
            <p className="text-muted-foreground">Track your time on projects</p>
          </div>
          <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Manual Entry
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Manual Time Entry</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <Select value={manualWorkroom} onValueChange={setManualWorkroom}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {workrooms.map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-sm text-muted-foreground">Hours</label>
                    <Input
                      type="number"
                      min="0"
                      value={manualHours}
                      onChange={(e) => setManualHours(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm text-muted-foreground">Minutes</label>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={manualMinutes}
                      onChange={(e) => setManualMinutes(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-muted-foreground">Date</label>
                  <Input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                  />
                </div>
                
                <Textarea
                  placeholder="What did you work on?"
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                />
                
                <Button onClick={handleManualEntry} className="w-full">
                  Add Entry
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Timer Card */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-5xl font-mono font-bold mb-4">
                {formattedTime}
              </div>
              
              <div className="flex justify-center gap-2 mb-4">
                {!activeEntry ? (
                  <Button size="lg" onClick={handleStartTimer} className="gap-2">
                    <Play className="h-5 w-5" />
                    Start Timer
                  </Button>
                ) : (
                  <Button size="lg" variant="destructive" onClick={handleStopTimer} className="gap-2">
                    <Square className="h-5 w-5" />
                    Stop
                  </Button>
                )}
              </div>
              
              <div className="max-w-sm mx-auto space-y-2">
                <Select value={selectedWorkroom} onValueChange={setSelectedWorkroom} disabled={!!activeEntry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {workrooms.map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Input
                  placeholder="What are you working on?"
                  value={timerDescription}
                  onChange={(e) => setTimerDescription(e.target.value)}
                  disabled={!!activeEntry}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Overview */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                This Week
              </CardTitle>
              <Badge variant="secondary" className="text-lg px-3">
                {stats.totalHours}h
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-1 h-24">
              {weekDays.map(day => {
                const minutes = getDayMinutes(day);
                const maxMinutes = 480; // 8 hours
                const height = Math.min((minutes / maxMinutes) * 100, 100);
                const isToday = isSameDay(day, today);
                
                return (
                  <div key={day.toISOString()} className="flex-1 flex flex-col items-center gap-1">
                    <div className="flex-1 w-full flex items-end">
                      <div 
                        className={`w-full rounded-t transition-all ${isToday ? 'bg-primary' : 'bg-primary/40'}`}
                        style={{ height: `${Math.max(height, 4)}%` }}
                      />
                    </div>
                    <span className={`text-xs ${isToday ? 'font-bold' : 'text-muted-foreground'}`}>
                      {format(day, 'EEE')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {minutes > 0 ? `${(minutes / 60).toFixed(1)}h` : '-'}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Entries */}
        <div>
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Entries
          </h2>
          
          <div className="space-y-2">
            {entries.slice(0, 10).map(entry => {
              const workroom = workrooms.find(w => w.id === entry.workroom_id);
              const hours = Math.floor((entry.duration_minutes || 0) / 60);
              const mins = (entry.duration_minutes || 0) % 60;
              
              return (
                <Card key={entry.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${entry.is_manual ? 'bg-blue-500/10' : 'bg-green-500/10'}`}>
                      {entry.is_manual ? (
                        <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Timer className="h-4 w-4 text-green-600 dark:text-green-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{entry.description || 'Work session'}</p>
                      <p className="text-xs text-muted-foreground">
                        {workroom?.name || 'Unknown project'} • {format(new Date(entry.started_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {hours > 0 ? `${hours}h ` : ''}{mins}m
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
            
            {entries.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No time entries yet. Start tracking your work!
              </p>
            )}
          </div>
        </div>
      </div>
    </ResponsiveLayout>
  );
};

export default WorkDiary;
