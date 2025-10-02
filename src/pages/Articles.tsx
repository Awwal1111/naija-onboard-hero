import React, { useState } from 'react'
import { ArrowLeft, BookOpen, ExternalLink, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useArticles } from '@/hooks/useArticles'
import { Logo } from '@/components/ui/logo'

const Articles = () => {
  const navigate = useNavigate()
  const { articles, loading, submitArticle, hasSubmitted, getSubmissionStatus } = useArticles()
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null)
  const [shortNote, setShortNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (articleId: string) => {
    if (!shortNote.trim()) return

    setSubmitting(true)
    const result = await submitArticle(articleId, shortNote)
    if (result.success) {
      setSelectedArticle(null)
      setShortNote('')
    }
    setSubmitting(false)
  }

  const getStatusBadge = (articleId: string) => {
    const status = getSubmissionStatus(articleId)
    if (!status) return null

    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending Review</Badge>
      case 'approved':
        return <Badge variant="default">Approved ✅</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected ❌</Badge>
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading articles...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-background border-b border-border px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="h-6 w-6 text-text-secondary" />
        </button>
        <Logo />
      </header>

      <div className="container mx-auto max-w-4xl p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary mb-2">Read & Earn Articles</h1>
          <p className="text-text-secondary">Read articles and write a short note to earn NC</p>
        </div>

        {articles.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="h-12 w-12 text-text-secondary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-text-primary mb-2">No Articles Available</h3>
              <p className="text-text-secondary">Check back later for new articles!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {articles.map((article) => {
              const submitted = hasSubmitted(article.id)
              const status = getSubmissionStatus(article.id)

              return (
                <Card key={article.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle>{article.title}</CardTitle>
                        <CardDescription className="mt-2">{article.description}</CardDescription>
                      </div>
                      {getStatusBadge(article.id)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
                      <span className="text-sm font-medium">Reward</span>
                      <Badge variant="default" className="text-base">
                        {article.reward_amount.toLocaleString()} NC
                      </Badge>
                    </div>

                    {article.submission_instructions && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">{article.submission_instructions}</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => window.open(article.article_url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Read Article
                      </Button>

                      <Dialog open={selectedArticle === article.id} onOpenChange={(open) => !open && setSelectedArticle(null)}>
                        <DialogTrigger asChild>
                          <Button
                            className="flex-1"
                            disabled={submitted && status !== 'rejected'}
                            onClick={() => setSelectedArticle(article.id)}
                          >
                            {submitted && status === 'approved' ? (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Completed
                              </>
                            ) : submitted && status === 'pending' ? (
                              'Pending Review'
                            ) : (
                              'Submit Note'
                            )}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Submit Your Note</DialogTitle>
                            <DialogDescription>
                              Write a brief note about what you learned from the article
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="shortNote">Your Note</Label>
                              <Textarea
                                id="shortNote"
                                value={shortNote}
                                onChange={(e) => setShortNote(e.target.value)}
                                placeholder="Write a short summary or key takeaways from the article..."
                                rows={6}
                                className="mt-2"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Minimum 50 characters
                              </p>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleSubmit(article.id)}
                                disabled={shortNote.trim().length < 50 || submitting}
                                className="flex-1"
                              >
                                {submitting ? 'Submitting...' : 'Submit Note'}
                              </Button>
                              <Button variant="outline" onClick={() => setSelectedArticle(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default Articles
