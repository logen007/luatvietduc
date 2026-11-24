/** Domain rules only. Actors MUST come from server authentication, never request JSON.
 * Persist transitions using a transaction and WHERE version = expectedVersion.
 * Socket events and the AI worker must re-check persisted state before publishing.
 */
export type Role = 'member' | 'guest' | 'support' | 'admin';
export type Jurisdiction = 'VN' | 'DE';
export interface Actor { id: string; role: Role; jurisdictions: readonly Jurisdiction[] }
export interface Conversation {
  id: string;
  ownerId: string;
  jurisdiction: Jurisdiction;
  status: 'ai' | 'queued' | 'human' | 'closed';
  assignedAgentId: string | null;
  version: number;
}

function validConversation(c: Conversation): boolean {
  return c.id.trim().length > 0 && c.ownerId.trim().length > 0 &&
    Number.isSafeInteger(c.version) && c.version >= 0 &&
    (c.jurisdiction === 'VN' || c.jurisdiction === 'DE') &&
    ['ai', 'queued', 'human', 'closed'].includes(c.status) &&
    (c.status === 'human' ? Boolean(c.assignedAgentId?.trim()) : c.assignedAgentId === null);
}
function staffInScope(c: Conversation, a: Actor): boolean {
  return Boolean(a.id.trim()) && (a.role === 'admin' ||
    (a.role === 'support' && a.jurisdictions.includes(c.jurisdiction)));
}
function guard(c: Conversation, expectedVersion: number): void {
  if (!validConversation(c)) throw new Error('INVALID_CONVERSATION');
  if (!Number.isSafeInteger(expectedVersion) || c.version !== expectedVersion) throw new Error('VERSION_CONFLICT');
}
export function canReadConversation(c: Conversation, a: Actor): boolean {
  if (!validConversation(c) || !a.id.trim()) return false;
  return a.id === c.ownerId || a.role === 'admin' ||
    (staffInScope(c, a) && c.assignedAgentId === a.id);
}
export function requestHuman(c: Conversation, a: Actor, expectedVersion: number): Conversation {
  guard(c, expectedVersion);
  if (!canReadConversation(c, a)) throw new Error('FORBIDDEN');
  if (c.status !== 'ai') throw new Error('INVALID_TRANSITION');
  return { ...c, status: 'queued', assignedAgentId: null, version: c.version + 1 };
}
/** Claiming exposes the transcript only after a successful atomic database update.
 * Queue summaries must omit message text, identity and private attachments.
 */
export function claimConversation(c: Conversation, a: Actor, expectedVersion: number): Conversation {
  guard(c, expectedVersion);
  if (!staffInScope(c, a)) throw new Error('FORBIDDEN');
  if (c.status !== 'queued') throw new Error('INVALID_TRANSITION');
  return { ...c, status: 'human', assignedAgentId: a.id, version: c.version + 1 };
}
export function canSendHumanReply(c: Conversation, a: Actor): boolean {
  return validConversation(c) && c.status === 'human' &&
    staffInScope(c, a) && c.assignedAgentId === a.id;
}
/** Worker-only predicate. A generation is scoped to BOTH conversation and version. */
export function canPublishAIReply(c: Conversation, generation: { conversationId: string; version: number }): boolean {
  return validConversation(c) && c.status === 'ai' &&
    generation.conversationId === c.id && generation.version === c.version;
}
