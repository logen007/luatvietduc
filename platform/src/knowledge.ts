/** Fail-closed eligibility gate. This does not assess legal correctness.
 * Called again before publishing an AI answer, not only when indexing content.
 */
import type { Jurisdiction } from './chat.js';
export interface KnowledgeSource {
  status: 'draft' | 'published' | 'withdrawn';
  visibility: 'public' | 'private';
  jurisdiction: Jurisdiction;
  aiAllowed: boolean;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewDueAt: string | null;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  sourceUrl: string;
  conflicting: boolean;
}
const timestamp = (value: string | null): number => value === null ? NaN : Date.parse(value);
export function isEligibleKnowledge(s: KnowledgeSource, jurisdiction: Jurisdiction, now: Date): boolean {
  if (jurisdiction !== 'VN' && jurisdiction !== 'DE') return false;
  const t = now.getTime();
  const reviewed = timestamp(s.reviewedAt);
  const due = timestamp(s.reviewDueAt);
  const from = timestamp(s.effectiveFrom);
  const until = timestamp(s.effectiveUntil);
  if (!Number.isFinite(t) || !Number.isFinite(reviewed) || !Number.isFinite(due) || !Number.isFinite(from)) return false;
  if (s.status !== 'published' || s.visibility !== 'public' || !s.aiAllowed ||
      s.jurisdiction !== jurisdiction || !s.reviewedBy?.trim() || s.conflicting) return false;
  if (reviewed > t || due <= t || from > t ||
      (s.effectiveUntil !== null && (!Number.isFinite(until) || until <= t || until <= from))) return false;
  try {
    const url = new URL(s.sourceUrl);
    if (url.protocol !== 'https:' || url.username || url.password) return false;
  } catch { return false; }
  return true;
}
