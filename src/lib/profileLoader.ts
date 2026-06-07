/**
 * Shared profile loader using DataLoader (MIT, OSS by Facebook).
 *
 * Purpose: collapse repeated `profiles?user_id=eq.X` lookups into a single
 * batched `user_id=in.(...)` request, and serve subsequent reads from an
 * in-memory TTL cache. Directly targets the 200k+ profile-by-id egress
 * burst observed in Supabase analytics.
 *
 * Usage:
 *   import { loadProfileBasic } from "@/lib/profileLoader";
 *   const profile = await loadProfileBasic(userId);
 */
import DataLoader from "dataloader";
import { supabase } from "@/integrations/supabase/client";

export type BasicProfile = {
  user_id: string;
  full_name: string | null;
  profile_picture_url: string | null;
  profession: string | null;
};

const TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { value: BasicProfile | null; expires: number }>();

function getCached(id: string): BasicProfile | null | undefined {
  const hit = cache.get(id);
  if (!hit) return undefined;
  if (hit.expires < Date.now()) {
    cache.delete(id);
    return undefined;
  }
  return hit.value;
}

const loader = new DataLoader<string, BasicProfile | null>(
  async (ids) => {
    const unique = Array.from(new Set(ids));
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, full_name, profile_picture_url, profession")
      .in("user_id", unique as string[])
      .limit(unique.length);

    if (error) {
      // Fail soft: return nulls so callers don't crash; don't cache misses.
      return ids.map(() => null);
    }
    const byId = new Map<string, BasicProfile>();
    for (const row of data ?? []) byId.set(row.user_id, row as BasicProfile);
    const now = Date.now();
    for (const id of unique) {
      cache.set(id, { value: byId.get(id) ?? null, expires: now + TTL_MS });
    }
    return ids.map((id) => byId.get(id) ?? null);
  },
  {
    // Coalesce calls fired within the same tick (React render burst)
    batch: true,
    maxBatchSize: 100,
    cache: false, // we manage our own TTL cache above
  }
);

export async function loadProfileBasic(
  userId: string
): Promise<BasicProfile | null> {
  if (!userId) return null;
  const cached = getCached(userId);
  if (cached !== undefined) return cached;
  return loader.load(userId);
}

export async function loadProfilesBasic(
  userIds: string[]
): Promise<Map<string, BasicProfile>> {
  const out = new Map<string, BasicProfile>();
  const missing: string[] = [];
  for (const id of userIds) {
    const cached = getCached(id);
    if (cached === undefined) missing.push(id);
    else if (cached) out.set(id, cached);
  }
  if (missing.length) {
    const fetched = await Promise.all(missing.map((id) => loader.load(id)));
    fetched.forEach((p, i) => {
      if (p) out.set(missing[i], p);
    });
  }
  return out;
}

export function invalidateProfile(userId: string) {
  cache.delete(userId);
  loader.clear(userId);
}

export function clearProfileCache() {
  cache.clear();
  loader.clearAll();
}
