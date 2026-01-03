import { useState } from 'react';
import { ArrowLeft, Upload, Link, FileText, Image, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LearningCourse } from '@/lib/learningCourses';
import { useLearningProgress } from '@/hooks/useLearningProgress';
import { useSecureFileUpload } from '@/hooks/useSecureFileUpload';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface PracticalTaskSubmissionProps {
  course: LearningCourse;
  onBack: () => void;
}

export function PracticalTaskSubmission({ course, onBack }: PracticalTaskSubmissionProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { submitPracticalTask, courseProgress } = useLearningProgress(course.id);
  const { uploadFile, uploadProgress } = useSecureFileUpload();
  
  const [submissionType, setSubmissionType] = useState<string>(
    course.practicalTask.submissionTypes[0] || 'text'
  );
  const [textContent, setTextContent] = useState('');
  const [urlContent, setUrlContent] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const isUploading = uploadProgress.isUploading;

  const existingSubmission = courseProgress?.practicalSubmission;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await uploadFile(file, 'practical-tasks');
    if (result.url) {
      setFileUrl(result.url);
      toast({ title: 'File uploaded successfully!' });
    } else {
      toast({ title: 'Upload failed', description: result.error || 'Unknown error', variant: 'destructive' });
    }
  };

  const handleSubmit = () => {
    let content = '';
    if (submissionType === 'text') {
      content = textContent;
    } else if (submissionType === 'url') {
      content = urlContent;
    } else if (submissionType === 'screenshot' || submissionType === 'file') {
      content = fileUrl;
    }

    if (!content) {
      toast({ title: 'Please provide your submission', variant: 'destructive' });
      return;
    }

    submitPracticalTask.mutate({
      taskId: course.id + '-practical',
      submissionType,
      content,
      fileUrl: submissionType === 'screenshot' || submissionType === 'file' ? fileUrl : undefined,
    }, {
      onSuccess: () => {
        toast({ 
          title: '🎉 Task Submitted!', 
          description: 'Your practical task is being reviewed. You\'ll receive your certificate once approved.' 
        });
      }
    });
  };

  const getSubmissionIcon = (type: string) => {
    switch (type) {
      case 'text': return <FileText className="h-4 w-4" />;
      case 'url': return <Link className="h-4 w-4" />;
      case 'screenshot': return <Image className="h-4 w-4" />;
      case 'file': return <Upload className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  if (existingSubmission) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-bold">Practical Task</h1>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-8">
          <Card className="text-center p-8">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-2">Task Already Submitted!</h2>
            <Badge variant={existingSubmission.status === 'approved' ? 'default' : 'secondary'} className="mb-4">
              {existingSubmission.status === 'approved' ? 'Approved' : 
               existingSubmission.status === 'rejected' ? 'Needs Revision' : 'Pending Review'}
            </Badge>
            
            {existingSubmission.status === 'approved' && courseProgress?.certificate && (
              <div className="mt-6">
                <p className="text-muted-foreground mb-4">
                  Congratulations! You've earned your certificate.
                </p>
                <Button onClick={() => navigate(`/certificate/${courseProgress.certificate.id}`)}>
                  View Certificate
                </Button>
              </div>
            )}

            {existingSubmission.status === 'pending' && (
              <p className="text-muted-foreground">
                Your submission is being reviewed. You'll be notified once it's approved.
              </p>
            )}

            {existingSubmission.status === 'rejected' && (
              <div className="mt-4">
                <p className="text-muted-foreground mb-2">
                  {existingSubmission.manual_feedback || existingSubmission.ai_feedback || 'Please revise and resubmit your task.'}
                </p>
                <Button variant="outline" onClick={() => {/* Allow resubmission */}}>
                  Submit Again
                </Button>
              </div>
            )}

            <Button variant="outline" className="mt-4" onClick={onBack}>
              Back to Course
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Practical Task</h1>
            <p className="text-xs text-muted-foreground">{course.title}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Task Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{course.practicalTask.title}</CardTitle>
            <CardDescription>{course.practicalTask.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-2">Instructions:</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {course.practicalTask.instructions}
              </p>
            </div>
            
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Example Submission:</h4>
              <p className="text-sm text-muted-foreground italic">
                {course.practicalTask.exampleSubmission}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Accepted formats:</span>
              {course.practicalTask.submissionTypes.map(type => (
                <Badge key={type} variant="outline" className="capitalize gap-1">
                  {getSubmissionIcon(type)}
                  {type}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submission Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Submission</CardTitle>
            <CardDescription>
              Complete the task and submit your work below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={submissionType} onValueChange={setSubmissionType}>
              <TabsList className="w-full">
                {course.practicalTask.submissionTypes.map(type => (
                  <TabsTrigger key={type} value={type} className="flex-1 gap-1 capitalize">
                    {getSubmissionIcon(type)}
                    {type}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="mt-4">
                <TabsContent value="text">
                  <Textarea
                    placeholder="Write your submission here... Include all relevant details and explanations."
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    className="min-h-[200px]"
                  />
                </TabsContent>

                <TabsContent value="url">
                  <div className="space-y-2">
                    <Input
                      type="url"
                      placeholder="https://example.com/your-work"
                      value={urlContent}
                      onChange={(e) => setUrlContent(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Paste a link to your work (Google Doc, Notion, GitHub, live site, etc.)
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="screenshot">
                  <div className="space-y-4">
                    {fileUrl ? (
                      <div className="relative">
                        <img 
                          src={fileUrl} 
                          alt="Screenshot" 
                          className="w-full rounded-lg border"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => setFileUrl('')}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent transition-colors">
                        <div className="flex flex-col items-center justify-center py-6">
                          <Image className="h-10 w-10 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">Click to upload screenshot</p>
                        </div>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={handleFileUpload}
                          disabled={isUploading}
                        />
                      </label>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="file">
                  <div className="space-y-4">
                    {fileUrl ? (
                      <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                        <FileText className="h-8 w-8 text-primary" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">File uploaded</p>
                          <p className="text-xs text-muted-foreground truncate">{fileUrl}</p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setFileUrl('')}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent transition-colors">
                        <div className="flex flex-col items-center justify-center py-6">
                          <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">Click to upload file</p>
                          <p className="text-xs text-muted-foreground">PDF, DOC, ZIP, etc.</p>
                        </div>
                        <input 
                          type="file" 
                          className="hidden"
                          onChange={handleFileUpload}
                          disabled={isUploading}
                        />
                      </label>
                    )}
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            <Button 
              className="w-full mt-6" 
              size="lg"
              onClick={handleSubmit}
              disabled={submitPracticalTask.isPending || isUploading}
            >
              {submitPracticalTask.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Submit Task
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
