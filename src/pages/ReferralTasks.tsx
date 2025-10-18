import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";

export default function ReferralTasks() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"highest" | "lowest">("highest");
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await supabase
          .from("referral_tasks")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (response.error) throw response.error;
        setTasks(response.data || []);
      } catch (error) {
        console.error("Error fetching tasks:", error);
        setTasks([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, []);

  const toggleExpanded = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const extractLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };

  const renderTextWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
            <ExternalLink className="h-3 w-3" />
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const filteredTasks = tasks
    .filter((task: any) => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a: any, b: any) => {
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
          <div className="space-y-2 sm:space-y-3">
            {filteredTasks.map((task: any) => {
              const isExpanded = expandedTasks.has(task.id);
              const hasLinks = extractLinks(task.description).length > 0;
              
              return (
                <Collapsible key={task.id} open={isExpanded} onOpenChange={() => toggleExpanded(task.id)}>
                  <Card>
                    <CardHeader className="p-3 sm:p-4 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm sm:text-base line-clamp-2">
                            {task.title}
                          </CardTitle>
                          <CardDescription className="text-xs sm:text-sm mt-1">
                            Reward: {task.reward.toLocaleString()} NC
                          </CardDescription>
                        </div>
                        <Badge variant="secondary" className="flex-shrink-0">
                          ₦{task.reward}NC
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0">
                      <CollapsibleTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-between text-xs sm:text-sm h-8"
                        >
                          <span>{isExpanded ? 'Show less' : 'View details'}</span>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent className="mt-3">
                        <div className="space-y-3">
                          <div className="text-sm text-muted-foreground">
                            {renderTextWithLinks(task.description)}
                          </div>
                          
                          {hasLinks && (
                            <div className="pt-2 border-t">
                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                Quick Links:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {extractLinks(task.description).map((link, idx) => (
                                  <Button
                                    key={idx}
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-7"
                                    onClick={() => window.open(link, '_blank')}
                                  >
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Link {idx + 1}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-xs text-muted-foreground">
                              Status: {task.status || 'available'}
                            </span>
                            <Button size="sm" className="text-xs h-7">
                              Start Task
                            </Button>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </CardContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}