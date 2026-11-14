import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canReadConversation, requestHuman, claimConversation, canSendHumanReply, canPublishAIReply } from '../dist/chat.js';
import { isEligibleKnowledge } from '../dist/knowledge.js';
const c = { id: 'conversation-a', ownerId: 'owner-a', jurisdiction: 'VN', status: 'ai', assignedAgentId: null, version: 4 };
const owner = { id: 'owner-a', role: 'member', jurisdictions: [] };
const other = { ...owner, id: 'owner-b' };
const agent = { id: 'agent-a', role: 'support', jurisdictions: ['VN'] };
const unrelated = { ...agent, id: 'agent-b' };
const deAgent = { ...agent, id: 'agent-de', jurisdictions: ['DE'] };
const admin = { id: 'admin', role: 'admin', jurisdictions: [] };
const generation = { conversationId: c.id, version: c.version };
const queued = requestHuman(c, owner, 4);
const assigned = claimConversation(queued, agent, 5);

test('owner can read own conversation', () => assert.equal(canReadConversation(c, owner), true));
test('other user cannot read transcript', () => assert.equal(canReadConversation(c, other), false));
test('unassigned support cannot read transcript', () => assert.equal(canReadConversation(c, agent), false));
test('admin can read for supervised operations', () => assert.equal(canReadConversation(c, admin), true));
test('guest ownership follows authenticated opaque identity', () => assert.equal(canReadConversation(c, { ...owner, role: 'guest' }), true));
test('handoff increments version and does not mutate original', () => {
  assert.equal(queued.status, 'queued'); assert.equal(queued.version, 5);
  assert.equal(c.status, 'ai'); assert.equal(c.version, 4);
});
test('other user cannot request handoff', () => assert.throws(() => requestHuman(c, other, 4), /FORBIDDEN/));
test('stale handoff fails', () => assert.throws(() => requestHuman(c, owner, 3), /VERSION_CONFLICT/));
test('duplicate handoff requires API idempotency handling', () => assert.throws(() => requestHuman(queued, owner, 5), /INVALID_TRANSITION/));
test('AI generation allowed only while AI owns current version', () => assert.equal(canPublishAIReply(c, generation), true));
test('handoff invalidates in-flight AI generation', () => assert.equal(canPublishAIReply(queued, generation), false));
test('AI cannot reply after agent claims', () => assert.equal(canPublishAIReply(assigned, generation), false));
test('AI cannot publish to another conversation', () => assert.equal(canPublishAIReply(c, { ...generation, conversationId: 'other' }), false));
test('AI cannot publish stale version', () => assert.equal(canPublishAIReply(c, { ...generation, version: 3 }), false));
test('agent can claim in-scope queued conversation', () => assert.equal(assigned.assignedAgentId, agent.id));
test('member cannot claim', () => assert.throws(() => claimConversation(queued, owner, 5), /FORBIDDEN/));
test('agent from wrong jurisdiction cannot claim', () => assert.throws(() => claimConversation(queued, deAgent, 5), /FORBIDDEN/));
test('agent cannot claim directly from AI mode', () => assert.throws(() => claimConversation(c, agent, 4), /INVALID_TRANSITION/));
test('concurrent second claim fails with stale version', () => assert.throws(() => claimConversation(assigned, unrelated, 5), /VERSION_CONFLICT/));
test('assigned agent can read and reply', () => { assert.equal(canReadConversation(assigned, agent), true); assert.equal(canSendHumanReply(assigned, agent), true); });
test('unassigned agent cannot read or reply', () => { assert.equal(canReadConversation(assigned, unrelated), false); assert.equal(canSendHumanReply(assigned, unrelated), false); });
test('admin cannot silently impersonate assigned agent', () => assert.equal(canSendHumanReply(assigned, admin), false));
test('closed conversations reject AI replies', () => assert.equal(canPublishAIReply({ ...c, status: 'closed' }, generation), false));
test('invalid conversation fails closed', () => assert.equal(canReadConversation({ ...c, version: -1 }, owner), false));
test('missing assigned agent in human state fails closed', () => assert.equal(canReadConversation({ ...c, status: 'human' }, owner), false));
test('empty authenticated identity denied', () => assert.equal(canReadConversation(c, { ...owner, id: '' }), false));

const now = new Date('2026-11-03T03:00:00Z');
const source = { status: 'published', visibility: 'public', jurisdiction: 'VN', aiAllowed: true, reviewedBy: 'reviewer-1', reviewedAt: '2026-11-01T00:00:00Z', reviewDueAt: '2026-12-01T00:00:00Z', effectiveFrom: '2026-01-01T00:00:00Z', effectiveUntil: null, sourceUrl: 'https://example.org/legal/source', conflicting: false };
test('approved current public source passes eligibility gate', () => assert.equal(isEligibleKnowledge(source, 'VN', now), true));
for (const [name, patch] of [
  ['private record', { visibility: 'private' }], ['draft', { status: 'draft' }],
  ['withdrawn source', { status: 'withdrawn' }], ['AI disallowed', { aiAllowed: false }],
  ['missing reviewer', { reviewedBy: null }], ['missing review date', { reviewedAt: null }],
  ['review expired', { reviewDueAt: '2026-11-01T00:00:00Z' }], ['missing review deadline', { reviewDueAt: null }],
  ['future effective date', { effectiveFrom: '2027-01-01T00:00:00Z' }], ['unknown effective date', { effectiveFrom: null }],
  ['expired law', { effectiveUntil: '2026-11-02T00:00:00Z' }], ['invalid date', { effectiveUntil: 'not-a-date' }],
  ['conflicting sources', { conflicting: true }], ['invalid URL', { sourceUrl: 'javascript:alert(1)' }],
  ['credentials in source URL', { sourceUrl: 'https://user:pass@example.org/' }],
  ['future review', { reviewedAt: '2027-01-01T00:00:00Z' }],
]) test(`knowledge rejects ${name}`, () => assert.equal(isEligibleKnowledge({ ...source, ...patch }, 'VN', now), false));
test('Vietnamese source cannot silently answer German law', () => assert.equal(isEligibleKnowledge(source, 'DE', now), false));
test('invalid evaluation time denied', () => assert.equal(isEligibleKnowledge(source, 'VN', new Date('invalid')), false));
const settings = JSON.parse(readFileSync(new URL('../config/site.defaults.json', import.meta.url), 'utf8'));
test('social links start empty, not Bizlawyer accounts', () => assert.deepEqual(settings.socialLinks, []));
test('domain is planned but not verified', () => { assert.equal(settings.site.plannedDomain, 'luatvietduc.com'); assert.equal(settings.site.domainVerified, false); });
test('AI/live chat remain off until operational acceptance', () => { assert.equal(settings.features.aiChat, false); assert.equal(settings.features.liveChat, false); });
test('private chats never become knowledge automatically', () => assert.equal(settings.ai.learnFromPrivateConversations, false));

test('unknown jurisdiction fails even if source matches', () => assert.equal(isEligibleKnowledge({...source,jurisdiction:'XX'},'XX',now),false));
