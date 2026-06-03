import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, ArrowRight, BookOpen } from 'lucide-react';
import { BLOG_POSTS } from '@/content/blogPosts';

const SITE = 'https://naijalancers.name.ng';

export default function BlogIndex() {
  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'NaijaLancers Blog',
    url: `${SITE}/blog`,
    blogPost: BLOG_POSTS.map((p) => ({
      '@type': 'BlogPosting',
      headline: p.title,
      description: p.description,
      datePublished: p.datePublished,
      dateModified: p.dateModified,
      author: { '@type': 'Organization', name: p.author },
      url: `${SITE}/blog/${p.slug}`,
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>NaijaLancers Blog — Freelance, Payments & Hiring in Nigeria</title>
        <meta
          name="description"
          content="Guides, playbooks and tutorials on freelance work, escrow payments, and hiring trusted freelancers in Nigeria — from the NaijaLancers team."
        />
        <link rel="canonical" href={`${SITE}/blog`} />
        <meta property="og:title" content="NaijaLancers Blog" />
        <meta
          property="og:description"
          content="Freelance, payments and hiring guides for Nigeria."
        />
        <meta property="og:url" content={`${SITE}/blog`} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(itemListLd)}</script>
      </Helmet>

      <header className="border-b border-border bg-card/50">
        <div className="container mx-auto max-w-4xl px-4 py-10">
          <div className="flex items-center gap-2 mb-3 text-primary">
            <BookOpen className="h-5 w-5" />
            <span className="text-sm font-medium">NaijaLancers Blog</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-2">
            Freelance, payments &amp; hiring in Nigeria
          </h1>
          <p className="text-text-secondary text-base md:text-lg max-w-2xl">
            Practical, no-fluff guides from the team behind NaijaLancers — covering escrow, secure
            payments, and how to hire the best freelancers in Nigeria.
          </p>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-8">
        <div className="grid gap-5 md:grid-cols-2">
          {BLOG_POSTS.map((post) => (
            <Link key={post.slug} to={`/blog/${post.slug}`} className="group">
              <Card className="h-full transition-all hover:shadow-lg hover:border-primary/40">
                <CardContent className="p-5 space-y-3">
                  <Badge variant="secondary">{post.category}</Badge>
                  <h2 className="text-lg font-semibold text-text-primary group-hover:text-primary transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-sm text-text-secondary line-clamp-3">{post.description}</p>
                  <div className="flex items-center justify-between text-xs text-text-secondary pt-2">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {post.readTime}
                    </span>
                    <span className="flex items-center gap-1 text-primary font-medium">
                      Read <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
