import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ResponsiveLayout from "@/components/ResponsiveLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useContests, ContestSubmission } from "@/hooks/useContests";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Trophy, Clock, Users, FileImage, Star, Upload, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow, isPast } from "date-fns";

const ContestDetail = () => {
  const { contestId } = useParams<{ contestId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { contests, loading, submitToContest, getContestSubmissions, selectWinner } = useContests();
  
  const [submissions, setSubmissions] = useState<ContestSubmission[]>([]);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [submissionTitle, setSubmissionTitle] = useState("");
  const [submissionDescription, setSubmissionDescription] = useState("");
  const [submissionFiles, setSubmissionFiles] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const contest = contests.find(c => c.id === contestId);
  const isOwner = contest?.client_id === user?.id;
  const hasSubmitted = submissions.some(s => s.freelancer_id === user?.id);
  const isDeadlinePassed = contest ? isPast(new Date(contest.deadline)) : false;

  useEffect(() => {
    if (contestId) {
      loadSubmissions();
    }
  }, [contestId]);

  const loadSubmissions = async () => {
    if (!contestId) return;
    const data = await getContestSubmissions(contestId);
    setSubmissions(data);
  };

  const handleSubmit = async () => {
    if (!submissionTitle.trim()) {
      toast.error("Please enter a title");
      return;
    }
    
    if (submissionFiles.length === 0 && !previewUrl) {
      toast.error("Please upload at least one file or preview");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await submitToContest(contestId!, {
        title: submissionTitle,
        description: submissionDescription,
        file_urls: submissionFiles,
        preview_url: previewUrl
      });
      
      setSubmitDialogOpen(false);
      setSubmissionTitle("");
      setSubmissionDescription("");
      setSubmissionFiles([]);
      setPreviewUrl("");
      loadSubmissions();
      toast.success("Entry submitted successfully!");
    } catch (error) {
      toast.error("Failed to submit entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectWinner = async (submissionId: string, freelancerId: string) => {
    if (!confirm("Are you sure you want to select this as the winner? The prize will be released to the freelancer.")) {
      return;
    }
    
    await selectWinner(contestId!, submissionId, freelancerId);
    loadSubmissions();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    // In production, upload to storage
    const urls = Array.from(files).map(f => URL.createObjectURL(f));
    setSubmissionFiles(prev => [...prev, ...urls]);
    toast.success(`${files.length} file(s) added`);
  };

  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    open: "bg-green-500/10 text-green-600 dark:text-green-400",
    judging: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    completed: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    cancelled: "bg-red-500/10 text-red-600 dark:text-red-400"
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

  if (!contest) {
    return (
      <ResponsiveLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Contest not found</p>
          <Button variant="link" onClick={() => navigate('/contests')}>
            Back to Contests
          </Button>
        </div>
      </ResponsiveLayout>
    );
  }

  const shortlistedSubmissions = submissions.filter(s => s.status === 'shortlisted');

  return (
    <ResponsiveLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/contests')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{contest.title}</h1>
              <Badge className={statusColors[contest.status || 'open']}>
                {contest.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{contest.category}</p>
          </div>
        </div>

        {/* Prize & Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Trophy className="h-6 w-6 mx-auto text-yellow-500 mb-1" />
              <p className="text-2xl font-bold">₦{contest.prize_amount.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Prize</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-6 w-6 mx-auto text-blue-500 mb-1" />
              <p className="text-2xl font-bold">{submissions.length}</p>
              <p className="text-xs text-muted-foreground">Entries</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-6 w-6 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold">
                {isDeadlinePassed ? 'Closed' : formatDistanceToNow(new Date(contest.deadline))}
              </p>
              <p className="text-xs text-muted-foreground">
                {isDeadlinePassed ? format(new Date(contest.deadline), 'MMM d') : 'Left'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Brief</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{contest.description}</p>
            
            {contest.requirements && contest.requirements.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Requirements</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {contest.requirements.map((req, i) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {contest.style_preferences && contest.style_preferences.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Style Preferences</h4>
                <div className="flex flex-wrap gap-2">
                  {contest.style_preferences.map((style, i) => (
                    <Badge key={i} variant="outline">{style}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Button (for freelancers) */}
        {!isOwner && !hasSubmitted && !isDeadlinePassed && contest.status === 'open' && (
          <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" size="lg">
                <Upload className="h-5 w-5 mr-2" />
                Submit Your Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Submit Entry</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <Input
                  placeholder="Entry title"
                  value={submissionTitle}
                  onChange={(e) => setSubmissionTitle(e.target.value)}
                />
                
                <Textarea
                  placeholder="Describe your submission..."
                  value={submissionDescription}
                  onChange={(e) => setSubmissionDescription(e.target.value)}
                />
                
                <div>
                  <label className="text-sm text-muted-foreground block mb-2">
                    Upload Files
                  </label>
                  <label className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center cursor-pointer hover:border-primary/50 transition-colors">
                    <FileImage className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Click to upload files</span>
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                  {submissionFiles.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {submissionFiles.length} file(s) selected
                    </p>
                  )}
                </div>
                
                <Input
                  placeholder="Preview URL (optional)"
                  value={previewUrl}
                  onChange={(e) => setPreviewUrl(e.target.value)}
                />
                
                <Button 
                  onClick={handleSubmit} 
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Submit Entry
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {hasSubmitted && (
          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
              <p className="text-green-700 dark:text-green-300">
                You've submitted an entry to this contest!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Submissions */}
        <Tabs defaultValue="all">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">All Entries ({submissions.length})</TabsTrigger>
            <TabsTrigger value="shortlisted">Shortlisted ({shortlistedSubmissions.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-4">
            <div className="grid gap-4">
              {submissions.map(submission => (
                <Card key={submission.id} className={submission.status === 'winner' ? 'ring-2 ring-yellow-500' : ''}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {submission.preview_url && (
                        <div className="w-24 h-24 rounded-lg bg-muted overflow-hidden shrink-0">
                          <img 
                            src={submission.preview_url} 
                            alt={submission.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-medium">{submission.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {submission.description}
                            </p>
                          </div>
                          {submission.status === 'winner' && (
                            <Badge className="bg-yellow-500 text-yellow-950 shrink-0">
                              <Trophy className="h-3 w-3 mr-1" />
                              Winner
                            </Badge>
                          )}
                          {submission.status === 'shortlisted' && (
                            <Badge variant="secondary" className="shrink-0">
                              <Star className="h-3 w-3 mr-1" />
                              Shortlisted
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 mt-3">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={submission.freelancer_avatar} />
                            <AvatarFallback className="text-xs">{submission.freelancer_name?.[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">{submission.freelancer_name}</span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(submission.created_at), 'MMM d, yyyy')}
                          </span>
                          {submission.file_urls && submission.file_urls.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {submission.file_urls.length} files
                            </Badge>
                          )}
                        </div>
                        
                        {isOwner && submission.status !== 'winner' && (
                          <div className="flex gap-2 mt-3">
                            <Button 
                              size="sm"
                              onClick={() => handleSelectWinner(submission.id, submission.freelancer_id)}
                            >
                              <Trophy className="h-4 w-4 mr-1" />
                              Select Winner
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {submissions.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No entries yet. Be the first to submit!
                </p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="shortlisted" className="mt-4">
            <div className="grid gap-4">
              {shortlistedSubmissions.map(submission => (
                <Card key={submission.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {submission.preview_url && (
                        <div className="w-24 h-24 rounded-lg bg-muted overflow-hidden shrink-0">
                          <img 
                            src={submission.preview_url} 
                            alt={submission.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-medium">{submission.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {submission.description}
                        </p>
                        
                        {isOwner && (
                          <Button 
                            size="sm" 
                            className="mt-3"
                            onClick={() => handleSelectWinner(submission.id, submission.freelancer_id)}
                          >
                            <Trophy className="h-4 w-4 mr-1" />
                            Select as Winner
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {shortlistedSubmissions.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No shortlisted entries yet
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ResponsiveLayout>
  );
};

export default ContestDetail;
