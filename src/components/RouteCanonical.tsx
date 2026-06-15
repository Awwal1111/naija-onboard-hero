import { useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";

const PRIMARY_DOMAIN = "https://naijalancers.name.ng";

/**
 * Per-route canonical + preview-domain noindex.
 *
 * Fixes Google "Duplicate without user-selected canonical" by emitting a unique
 * canonical for every URL (instead of every page claiming the homepage as its
 * canonical via the static tag in index.html).
 *
 * Also adds `noindex` on the *.lovable.app preview/published hosts so only the
 * primary domain is indexed — eliminates duplicate-content competition between
 * naijalancers.name.ng, naijalancers.lovable.app, and id-preview--*.lovable.app.
 */
export default function RouteCanonical() {
  const { pathname, search } = useLocation();
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const isPreviewHost = host.endsWith(".lovable.app");

  // Strip trailing slash (except root) so /jobs and /jobs/ collapse to one canonical.
  let path = pathname || "/";
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);

  // Drop tracking / session params from the canonical to consolidate signals.
  const KEEP_QUERY_ROUTES = new Set(["/blog", "/experts", "/jobs", "/gigs", "/courses", "/p/jobs", "/p/gigs", "/p/experts"]);
  const keepQuery = KEEP_QUERY_ROUTES.has(path) && search;
  const canonicalUrl = `${PRIMARY_DOMAIN}${path}${keepQuery ? search : ""}`;

  return (
    <Helmet>
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:url" content={canonicalUrl} />
      {isPreviewHost && <meta name="robots" content="noindex, nofollow" />}
    </Helmet>
  );
}
