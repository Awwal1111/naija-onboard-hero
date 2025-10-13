import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Briefcase, MapPin, Clock, Bookmark, Star, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNigerianStates } from "@/hooks/useNigerianStates";
import JobApplicationDialog from "@/components/JobApplicationDialog";
import { format } from "date-fns";

export default function JobsEnhanced() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState<string>("all");
  const [selectedLGA, setSelectedLGA] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [applicationDialogOpen, setApplicationDialogOpen] = useState(false);

  const { states, lgas, fetchLGAs } = useNigerianStates();
  
  const handleStateChange = async (value: string) => {
    setSelectedState(value);
    setSelectedLGA("all");
    if (value !== "all") {
      await fetchLGAs(value);
    }
  };

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["jobs-enhanced"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_posts")
        .select(`
          *,
          profiles!job_posts_user_id_fkey(full_name, profile_picture_url, profession)
        `)
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const saveJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("saved_jobs").insert({
        user_id: user.id,
        job_post_id: jobId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Job saved successfully!" });
      queryClient.invalidateQueries({ queryKey: ["saved-jobs"] });
    },
  });

  const categories = [
    "Technology",
    "Healthcare",
    "Education",
    "Finance",
    "Marketing",
    "Sales",
    "Engineering",
    "Design",
    "Writing",
    "Customer Service",
    "Other"
  ];

  

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesState = selectedState === "all" || job.location?.includes(selectedState);
    const matchesLGA = selectedLGA === "all" || job.location?.includes(selectedLGA);
    const matchesCategory = selectedCategory === "all" || job.required_skills?.includes(selectedCategory);

    return matchesSearch && matchesState && matchesLGA && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-bold">Job Opportunities</h1>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedState} onValueChange={handleStateChange}>
            <SelectTrigger>
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              {states.map(state => (
                <SelectItem key={state.name} value={state.name}>{state.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedLGA} onValueChange={setSelectedLGA} disabled={selectedState === "all"}>
            <SelectTrigger>
              <SelectValue placeholder="LGA" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All LGAs</SelectItem>
              {lgas.map(lga => (
                <SelectItem key={lga.name} value={lga.name}>{lga.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setSelectedState("all");
              setSelectedLGA("all");
              setSelectedCategory("all");
            }}
          >
            Clear Filters
          </Button>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No jobs found</div>
        ) : (
          <div className="space-y-3">
            {filteredJobs.map((job: any) => (
              <Card key={job.id}>
                <CardHeader className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm">{job.title}</h3>
                        {job.is_remote && <Badge variant="secondary" className="text-xs">Remote</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{job.company_name || "Company"}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => saveJobMutation.mutate(job.id)}
                      >
                        <Bookmark className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-2">
                  <p className="text-xs text-muted-foreground line-clamp-2">{job.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {job.location && (
                      <Badge variant="outline" className="text-xs">
                        <MapPin className="h-3 w-3 mr-1" />
                        {job.location}
                      </Badge>
                    )}
                    {job.budget_min && (
                      <Badge variant="outline" className="text-xs">
                        ₦{job.budget_min} - ₦{job.budget_max}
                      </Badge>
                    )}
                    {job.experience_level && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {job.experience_level}
                      </Badge>
                    )}
                    {job.application_deadline && new Date(job.application_deadline) > new Date() && (
                      <Badge variant="outline" className="text-xs text-orange-500">
                        <Clock className="h-3 w-3 mr-1" />
                        {Math.ceil((new Date(job.application_deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}d left
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span>{job.applications_count} applicants</span>
                      {job.views_count > 0 && (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {job.views_count} views
                        </span>
                      )}
                    </div>
                    <span>{format(new Date(job.created_at), "MMM dd, yyyy")}</span>
                  </div>
                </CardContent>
                <CardFooter className="p-3 pt-0 gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedJob(job);
                      setApplicationDialogOpen(true);
                    }}
                  >
                    <Briefcase className="h-4 w-4 mr-1" />
                    Apply Now
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {selectedJob && (
        <JobApplicationDialog
          isOpen={applicationDialogOpen}
          onClose={() => setApplicationDialogOpen(false)}
          jobPost={selectedJob}
        />
      )}
    </div>
  );
}
