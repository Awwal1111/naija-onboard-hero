import { Link, useParams, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Clock, Calendar, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BLOG_POSTS, getPostBySlug } from '@/content/blogPosts';

const SITE = 'https://naijalancers.name.ng';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getPostBySlug(slug) : undefined;

  if (!post) return <Navigate to="/blog" replace />;

  const url = `${SITE}/blog/${post.slug}`;
  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.datePublished,
    dateModified: post.dateModified,
    author: { '@type': 'Organization', name: post.author },
    publisher: {
      '@type': 'Organization',
      name: 'NaijaLancers',
      url: SITE,
    },
    mainEntityOfPage: url,
    url,
  };
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: url },
    ],
  };

  const related = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 2);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{post.title}</title>
        <meta name="description" content={post.description} />
        <meta name="keywords" content={post.keywords} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.description} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="article" />
        <meta property="article:published_time" content={post.datePublished} />
        <meta property="article:modified_time" content={post.dateModified} />
        <meta property="article:author" content={post.author} />
        <meta property="article:section" content={post.category} />
        <script type="application/ld+json">{JSON.stringify(articleLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbLd)}</script>
      </Helmet>

      <header className="border-b border-border bg-card/40">
        <div className="container mx-auto max-w-3xl px-4 py-4">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> All articles
          </Link>
        </div>
      </header>

      <article className="container mx-auto max-w-3xl px-4 py-8">
        <Badge variant="secondary" className="mb-3">
          {post.category}
        </Badge>
        <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-4 leading-tight">
          {post.title}
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary mb-8 pb-6 border-b border-border">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(post.datePublished).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {post.readTime}
          </span>
          <span>By {post.author}</span>
        </div>

        <div className="prose prose-lg max-w-none">{post.body}</div>

        <div className="mt-12 pt-8 border-t border-border">
          <h3 className="text-xl font-bold text-text-primary mb-4">Keep reading</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {related.map((r) => (
              <Link
                key={r.slug}
                to={`/blog/${r.slug}`}
                className="block p-4 rounded-lg border border-border hover:border-primary/40 transition-colors group"
              >
                <Badge variant="secondary" className="mb-2">
                  {r.category}
                </Badge>
                <h4 className="font-semibold text-text-primary group-hover:text-primary mb-1">
                  {r.title}
                </h4>
                <p className="text-sm text-text-secondary line-clamp-2">{r.description}</p>
                <span className="inline-flex items-center gap-1 text-primary text-sm font-medium mt-2">
                  Read <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-10 p-6 rounded-xl bg-primary/5 border border-primary/20 text-center">
          <h3 className="text-lg font-bold text-text-primary mb-2">
            Ready to hire or get hired?
          </h3>
          <p className="text-sm text-text-secondary mb-4">
            Join thousands of Nigerian freelancers and clients on NaijaLancers — escrow-protected on every order.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button asChild>
              <Link to="/signup">Create a free account</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/p/experts">Browse freelancers</Link>
            </Button>
          </div>
        </div>
      </article>
    </div>
  );
}
