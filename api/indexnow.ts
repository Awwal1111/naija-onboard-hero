import { timingSafeEqual } from "node:crypto";

const HOST = "www.naijalancers.name.ng";
const BASE_URL = `https://${HOST}`;
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedTables = new Set(["profiles", "jobs_services", "job_posts", "courses"]);

type Row = Record<string, unknown>;
type EventPayload = {
  type?: "INSERT" | "UPDATE" | "DELETE";
  table?: string;
  schema?: string;
  record?: Row | null;
  old_record?: Row | null;
};

function constantTimeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function validId(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

function safeSlug(value: unknown): string | null {
  if (typeof value !== "string" || value.length < 1 || value.length > 100) return null;
  if (value.includes("/") || value.includes("\\") || value.trim() !== value) return null;
  return encodeURIComponent(value);
}

function profilePath(row: Row): string | null {
  const userId = validId(row.user_id) ? row.user_id : null;
  const username = safeSlug(row.username);
  if (row.is_expert === true) {
    const identifier = username ?? userId;
    return identifier ? `/p/expert/${identifier}` : null;
  }
  return username ? `/u/${username}` : null;
}

function publicPath(table: string, row: Row | null): string | null {
  if (!row) return null;
  switch (table) {
    case "profiles":
      return profilePath(row);
    case "jobs_services":
      return validId(row.id) && row.status === "active" ? `/p/gig/${row.id}` : null;
    case "job_posts":
      return validId(row.id) && row.status === "active" ? `/p/job/${row.id}` : null;
    case "courses":
      return validId(row.id) && row.status === "active" ? `/p/course/${row.id}` : null;
    default:
      return null;
  }
}

function previousPath(table: string, row: Row | null): string | null {
  if (!row) return null;
  switch (table) {
    case "profiles":
      return profilePath(row);
    case "jobs_services":
      return validId(row.id) && row.status === "active" ? `/p/gig/${row.id}` : null;
    case "job_posts":
      return validId(row.id) && row.status === "active" ? `/p/job/${row.id}` : null;
    case "courses":
      return validId(row.id) && row.status === "active" ? `/p/course/${row.id}` : null;
      return validId(row.id) ? `/p/campaign/${row.id}` : null;
    default:
      return null;
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const expectedSecret = process.env.INDEXNOW_WEBHOOK_SECRET;
  const providedSecret = req.headers["x-indexnow-webhook-secret"];
  const secret = Array.isArray(providedSecret) ? providedSecret[0] : providedSecret;

  if (!expectedSecret || typeof secret !== "string" || !constantTimeEqual(secret, expectedSecret)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const key = process.env.INDEXNOW_KEY;
  if (!key || !/^[a-fA-F0-9-]{8,128}$/.test(key)) {
    return res.status(503).json({ error: "IndexNow is not configured" });
  }

  const payload = req.body as EventPayload;
  if (
    !payload ||
    payload.schema !== "public" ||
    !allowedTables.has(String(payload.table)) ||
    !["INSERT", "UPDATE", "DELETE"].includes(String(payload.type))
  ) {
    return res.status(400).json({ error: "Invalid database event" });
  }

  const table = payload.table as string;
  const current = payload.record ?? null;
  const previous = payload.old_record ?? null;
  const paths = new Set<string>();

  const add = (path: string | null) => {
    if (path) paths.add(`${BASE_URL}${path}`);
  };

  if (payload.type === "DELETE") {
    add(previousPath(table, previous));
  } else {
    add(publicPath(table, current));
    const oldPath = previousPath(table, previous);
    const newPath = publicPath(table, current);
    if (oldPath && oldPath !== newPath) add(oldPath);
  }

  if (paths.size > 0) {
    if (table === "profiles" && (current?.is_expert === true || previous?.is_expert === true)) {
      paths.add(`${BASE_URL}/p/experts`);
    }
    if (table === "jobs_services") paths.add(`${BASE_URL}/p/gigs`);
    if (table === "job_posts") paths.add(`${BASE_URL}/p/jobs`);
  }

  const urlList = [...paths].filter((url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:" && parsed.hostname === HOST && !parsed.username && !parsed.password;
    } catch {
      return false;
    }
  });

  if (urlList.length === 0) {
    return res.status(200).json({ accepted: true, submitted: 0, reason: "No public URL changed" });
  }

  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: HOST,
        key,
        keyLocation: `${BASE_URL}/${key}.txt`,
        urlList,
      }),
    });
    const responseText = await response.text();

    if (response.status !== 200 && response.status !== 202) {
      console.error("IndexNow submission rejected", {
        status: response.status,
        table,
        event: payload.type,
        urlCount: urlList.length,
        response: responseText.slice(0, 500),
      });
      return res.status(502).json({
        accepted: false,
        submitted: 0,
        indexNowStatus: response.status,
        message: responseText.slice(0, 300),
      });
    }

    return res.status(200).json({
      accepted: true,
      submitted: urlList.length,
      indexNowStatus: response.status,
      verificationPending: response.status === 202,
    });
  } catch (error) {
    console.error("IndexNow request failed", error);
    return res.status(502).json({ accepted: false, error: "IndexNow request failed" });
  }
}
