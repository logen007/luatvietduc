# Admin workflow — 01.06.00

Reference: WordPress Administration Screens https://wordpress.org/documentation/article/administration-screens/ . Editorial work precedes users and settings; secondary tools appear under their parent.

One visible sidebar tree uses the existing afterNavLinks extension. Native generated collection groups are suppressed only when the custom navigation exists; native collapse, account and logout controls stay. All underlying collection and route authorization remains server-enforced. Sequence: Overview → Posts (new post) → Media → AI Knowledge → Inbox → Users/Permissions → Settings (website, connections, backup, audit). Links are role-specific, active routes highlighted and mobile navigation closes on selection. Settings overview contains only settings and maintenance, not repeated content destinations.

/admin/knowledge is the main article authoring workspace: title, body, and country only when more than one is assigned. Draft/publication controls include edits/withdrawal. Optional source, approved equivalent questions and review date live in collapsed options. Missing source generates a canonical URL to this specialist-authored article, not a fabricated external citation. /service/knowledge-source/<UUID> serves only published, approved, effective, unexpired and not-overdue source text; drafts/withdrawn records are not exposed. Publishing explicitly makes the text a public AI source. No personal records belong in it.

Existing source schema and country/role scope are reused without migration. Default review is90days and effective date is current time. Existing source/policy dates are preserved on edit. Authoring writes use a Payload transaction plus row lock and frontend revision check. Native advanced collection editing and revisions remain available without duplicate main menu entries.

AI answer coverage stays conservative: canonical title or specialist-approved equivalent questions only. This release simplifies article ingestion; it does not silently enable unconstrained semantic answering or invent FAQ answers from uploaded articles. Questions outside coverage still hand off. Model keys and provider activation are separate. Existing internal test endpoints remain but are removed from the primary authoring flow.

Validation uses synthetic fixtures: role and country isolation, defaults, source URL validation, stale-write rejection, publication and withdrawal. No customer data used.
