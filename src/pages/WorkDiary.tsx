import { useState } from "react";
import ResponsiveLayout from "@/components/ResponsiveLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkDiary } from "@/hooks/useWorkDiary";
import { useWorkrooms } from "@/hooks/useWorkrooms";
import { Play, Square, Clock, Calendar, Plus, Timer, BarChart3, Loader2, Trash2, DollarSign, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, subWeeks, addWeeks } from "date-fns";
import { BottomNavBar } from "@/components/BottomNavBar";
import { useNavigate } from "react-router-dom";

const WorkDiary = () => {
  const navigate = useNavigate();
  const { 
    entries, 
    loading, 
    activeEntry, 
    elapsedTime, 
    formattedTime,
    startTimer, 
    stopTimer, 
    addManualEntry,
    deleteEntry,
    getStats
  } = useWorkDiary();
  const { workrooms } = useWorkrooms();
  
  const [selectedWorkroom, setSelectedWorkroom] = useState<string>("");
  const [timerDescription, setTimerDescription] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [filterWorkroom, setFilterWorkroom] = useState<string>("all");
  
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

  const handleDeleteEntry = async (entryId: string) => {
    if (confirm('Delete this time entry?')) {
      await deleteEntry(entryId);
    }
  };

  // Weekly view with navigation
  const today = new Date();
  const currentWeekStart = startOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd });
  
  const weeklyEntries = entries.filter(e => {
    const entryDate = new Date(e.started_at);
    return entryDate >= currentWeekStart && entryDate <= currentWeekEnd;
  });
  
  const allStats = getStats(entries);
  const weekStats = getStats(weeklyEntries);

  // Filter entries
  const filteredEntries = entries.filter(e => 
    filterWorkroom === 'all' || e.workroom_id === filterWorkroom
  );

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
    <>
      <ResponsiveLayout>
        <div className="space-y-6 pb-24">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Work Diary</h1>
                <p className="text-sm text-muted-foreground">Track your time on projects</p>
              </div>
            </div>
            <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Manual
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
                      <Input type="number" min="0" value={manualHours} onChange={(e) => setManualHours(e.target.value)} placeholder="0" />
                    </div>
                    <div className="flex-1">
                      <label className="text-sm text-muted-foreground">Minutes</label>
                      <Input type="number" min="0" max="59" value={manualMinutes} onChange={(e) => setManualMinutes(e.target.value)} placeholder="0" />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-muted-foreground">Date</label>
                    <Input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} max={format(new Date(), 'yyyy-MM-dd')} />
                  </div>
                  
                  <Textarea placeholder="What did you work on?" value={manualDescription} onChange={(e) => setManualDescription(e.target.value)} />
                  
                  <Button onClick={handleManualEntry} className="w-full">Add Entry</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Timer Card */}
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-5xl font-mono font-bold mb-4 tabular-nums">
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
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Earnings Summary */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-muted-foreground">Total Earnings</span>
                </div>
                <p className="text-xl font-bold">NC {allStats.totalEarnings.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{allStats.billableHours}h billable</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-muted-foreground">Pending</span>
                </div>
                <p className="text-xl font-bold">NC {allStats.pendingEarnings.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{allStats.pendingHours}h awaiting</p>
              </CardContent>
            </Card>
          </div>

          {/* Weekly Overview with Navigation */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => setWeekOffset(prev => prev - 1)}>←</Button>
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  {format(currentWeekStart, 'MMM d')} – {format(currentWeekEnd, 'MMM d, yyyy')}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setWeekOffset(prev => Math.min(prev + 1, 0))} disabled={weekOffset >= 0}>→</Button>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{weekStats.totalHours}h total</span>
                <Badge variant="secondary" className="text-xs">
                  {weekStats.billableHours}h billable
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-1 h-24">
                {weekDays.map(day => {
                  const minutes = getDayMinutes(day);
                  const maxMinutes = 480;
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

          {/* Entries List with Filter */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Time Entries
              </h2>
              <Select value={filterWorkroom} onValueChange={setFilterWorkroom}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {workrooms.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              {filteredEntries.slice(0, 20).map(entry => {
                const workroom = workrooms.find(w => w.id === entry.workroom_id);
                const hours = Math.floor((entry.duration_minutes || 0) / 60);
                const mins = (entry.duration_minutes || 0) % 60;
                
                return (
                  <Card key={entry.id}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className={`p-2 rounded-lg shrink-0 ${entry.is_manual ? 'bg-blue-500/10' : 'bg-green-500/10'}`}>
                        {entry.is_manual ? (
                          <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Timer className="h-4 w-4 text-green-600 dark:text-green-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{entry.description || 'Work session'}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs text-muted-foreground">
                            {workroom?.name || 'Unknown'} • {format(new Date(entry.started_at), 'MMM d, h:mm a')}
                          </p>
                          {/* Status badges */}
                          {entry.payment_status === 'paid' && (
                            <Badge variant="outline" className="text-[10px] h-4 text-green-600 border-green-600/30">
                              <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />paid
                            </Badge>
                          )}
                          {entry.is_approved && entry.payment_status !== 'paid' && (
                            <Badge variant="outline" className="text-[10px] h-4 text-blue-600 border-blue-600/30">
                              approved
                            </Badge>
                          )}
                          {entry.billable && !entry.is_approved && (
                            <Badge variant="outline" className="text-[10px] h-4 text-yellow-600 border-yellow-600/30">
                              pending
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="tabular-nums">
                          {hours > 0 ? `${hours}h ` : ''}{mins}m
                        </Badge>
                        {entry.payment_status === 'pending' && !activeEntry && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteEntry(entry.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              
              {filteredEntries.length === 0 && (
                <Card className="text-center py-8">
                  <CardContent>
                    <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="font-medium">No time entries yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Start the timer or add a manual entry</p>
                  </CardContent>
                </Card>
              )}

              {filteredEntries.length > 20 && (
                <p className="text-center text-sm text-muted-foreground py-2">
                  Showing 20 of {filteredEntries.length} entries
                </p>
              )}
            </div>
          </div>
        </div>
      </ResponsiveLayout>
      <BottomNavBar />
    </>
  );
};

export default WorkDiary;
