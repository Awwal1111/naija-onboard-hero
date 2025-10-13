import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { BookOpen, Plus, ExternalLink, Trash2, Edit, CheckCircle, XCircle } from 'lucide-react'
import { useAdminArticles } from '@/hooks/useArticles'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const AdminArticlesSection = () => {
  const { articles, submissions, loading, createArticle, updateArticle, deleteArticle, approveSubmission, rejectSubmission } = useAdminArticles()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    article_url: '',
    submission_instructions: '',
    reward_amount: 0
  })

  const handleCreateArticle = async () => {
    const result = await createArticle({
      ...formData,
      status: 'active'
    })

    if (result.success) {
      setIsCreateDialogOpen(false)
      setFormData({
        title: '',
        description: '',
        article_url: '',
        submission_instructions: '',
        reward_amount: 0
      })
    }
  }

  const handleApprove = async (submissionId: string) => {
    await approveSubmission(submissionId)
  }

  const handleReject = async (submissionId: string) => {
    await rejectSubmission(submissionId)
  }

  const handleDelete = async (articleId: string) => {
    if (confirm('Are you sure you want to delete this article?')) {
      await deleteArticle(articleId)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <Tabs defaultValue="submissions" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="submissions">Article Submissions ({submissions.filter(s => s.status === 'pending').length})</TabsTrigger>
        <TabsTrigger value="manage">Manage Articles ({articles.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="submissions" className="space-y-4">
        <Alert>
          <BookOpen className="h-4 w-4" />
          <AlertDescription>
            Review user submissions for articles. Approve to credit rewards automatically.
          </AlertDescription>
        </Alert>

        {submissions.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">No submissions yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <Card key={submission.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">{submission.article?.title}</CardTitle>
                      <CardDescription>
                        User: {submission.profiles?.full_name || 'Unknown'}
                      </CardDescription>
                      <p className="text-xs text-muted-foreground mt-1">
                        Reward: {submission.article?.reward_amount} NC
                      </p>
                    </div>
                    {submission.status === 'pending' && (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                    {submission.status === 'approved' && (
                      <Badge variant="default">Approved</Badge>
                    )}
                    {submission.status === 'rejected' && (
                      <Badge variant="destructive">Rejected</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">User's Note:</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {submission.short_note}
                    </p>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Submitted: {new Date(submission.created_at).toLocaleString()}
                  </div>

                  {submission.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(submission.id)}
                        className="flex-1"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve & Credit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(submission.id)}
                        className="flex-1"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="manage" className="space-y-4">
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Create New Article
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Article</DialogTitle>
              <DialogDescription>
                Add a new article for users to read and earn from
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Article Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., 10 Tips for Freelancing Success"
                />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the article..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="article_url">Article URL *</Label>
                <Input
                  id="article_url"
                  type="url"
                  value={formData.article_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, article_url: e.target.value }))}
                  placeholder="https://example.com/article"
                />
              </div>

              <div>
                <Label htmlFor="instructions">Submission Instructions</Label>
                <Textarea
                  id="instructions"
                  value={formData.submission_instructions}
                  onChange={(e) => setFormData(prev => ({ ...prev, submission_instructions: e.target.value }))}
                  placeholder="Tell users what to include in their note..."
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="reward">Reward Amount (NC) *</Label>
                <Input
                  id="reward"
                  type="number"
                  value={formData.reward_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, reward_amount: Number(e.target.value) }))}
                  placeholder="e.g., 50"
                />
              </div>

              <Button
                onClick={handleCreateArticle}
                disabled={!formData.title || !formData.article_url || formData.reward_amount <= 0}
                className="w-full"
              >
                Create Article
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {articles.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="h-12 w-12 text-text-secondary mx-auto mb-4" />
              <p className="text-muted-foreground">No articles created yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {articles.map((article) => (
              <Card key={article.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">{article.title}</CardTitle>
                      <CardDescription>{article.description}</CardDescription>
                    </div>
                    <Badge variant={article.status === 'active' ? 'default' : 'secondary'}>
                      {article.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Submissions</p>
                      <p className="font-semibold">{article.total_submissions}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Approved</p>
                      <p className="font-semibold text-green-600">{article.approved_submissions}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(article.article_url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Article
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(article.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}

export default AdminArticlesSection
