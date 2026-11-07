# Admin workflow — 01.07.00

Reference: WordPress Administration Screens https://wordpress.org/documentation/article/administration-screens/ . Editorial work precedes users and settings; secondary tools appear under their parent.

One visible sidebar tree uses the existing afterNavLinks extension. Native generated collection groups are suppressed only when the custom navigation exists; native collapse, account and logout controls stay. All underlying collection and route authorization remains server-enforced. Sequence: Overview → Posts (new post) → Media → AI Knowledge → Inbox → Users/Permissions → Settings (website, connections, backup, audit). Links are role-specific, active routes highlighted and mobile navigation closes on selection. Settings overview contains only settings and maintenance, not repeated content destinations.

/admin/knowledge is the main article authoring workspace: title and body only; sources may cover both Vietnamese and German law. Draft/publication controls include edits/withdrawal. Optional source, approved equivalent questions and review date live in collapsed options. Missing source generates a canonical URL to this specialist-authored article, not a fabricated external citation. /service/knowledge-source/<UUID> serves only published, approved, effective, unexpired and not-overdue source text; drafts/withdrawn records are not exposed. Publishing explicitly makes the text a public AI source. No personal records belong in it.

Existing source schema and country/role scope are reused without migration. Default review is90days and effective date is current time. Existing source/policy dates are preserved on edit. Authoring writes use a Payload transaction plus row lock and frontend revision check. Native advanced collection editing and revisions remain available without duplicate main menu entries.

AI answer coverage stays conservative: canonical title or specialist-approved equivalent questions only. This release simplifies article ingestion; it does not silently enable unconstrained semantic answering or invent FAQ answers from uploaded articles. Questions outside coverage still hand off. Model keys and provider activation are separate. Existing internal test endpoints remain but are removed from the primary authoring flow.

Validation uses synthetic fixtures: role and country isolation, defaults, source URL validation, stale-write rejection, publication and withdrawal. No customer data used.

## Shared corpus and scale

New article submissions use BOTH shared scope, with no country selector in authoring or customer chat. Existing VN/DE records retain their scope and access rules; shared records are available to scoped knowledge staff. The visitor can ask for a person in conversation; no separate button. Unknown/missing/conflicting sources record a real handoff, then a specialist claims and replies in the same transcript. No availability or response-time promise is made.

The old latest-1000 catalog scan is replaced by a PostgreSQL GIN expression index over normalized canonical questions and approved aliases. Queries retrieve at most two matching sources to detect ambiguity across the entire corpus; suggestions fetch four metadata rows. Staff article lists paginate25 per page and search on the server. The normalization preserves comparison operators, decimals and percentages. Review/expiry/withdrawal/provider/generation race checks remain.

A synthetic CI helper seeds10051 entries, retrieves the oldest valid source, checks GIN plan availability, checks JS/SQL normalization and ambiguity, and tests two country teams racing to claim a shared intake. This is a corpus correctness check, not a production concurrency/latency benchmark. Model quotas, concurrent visitors and source duplication remain independent limits.

This is indexed exact-question retrieval, not semantic RAG. True semantic RAG additionally needs chunking, multilingual embeddings, a semantic index, relevance/coverage validation and grounded answers with citations; fine-tuning alone does not constrain responses to a live knowledge base. Reference: https://cloud.google.com/use-cases/retrieval-augmented-generation . Private questions are not sent to providers under the current public-FAQ-only data flow. A future RAG provider flow must honor the already chosen customer-consent requirement.
