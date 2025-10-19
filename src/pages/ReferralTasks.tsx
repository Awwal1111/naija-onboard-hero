import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReferralTaskCard } from "@/components/ReferralTaskCard";
import { useReferralTasks } from "@/hooks/useReferralTasks";

export default function ReferralTasks() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"highest" | "lowest">("highest");
  const { tasks, loading: isLoading, submitTask, hasSubmitted, getSubmissionStatus } = useReferralTasks();

  const filteredTasks = tasks
    .filter((task) => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Filter by submission status
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
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-base sm:text-lg font-bold">Referral Tasks</h1>
        </div>
      </div>

      <div className="p-2 sm:p-3 space-y-3">
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
        {isLoading ? (
          <div className="text-center py-8 text-sm">Loading...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">No tasks found</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredTasks.map((task) => (
              <ReferralTaskCard
                key={task.id}
                task={task}
                hasSubmitted={hasSubmitted(task.id)}
                submissionStatus={getSubmissionStatus(task.id)}
                onSubmit={submitTask}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}