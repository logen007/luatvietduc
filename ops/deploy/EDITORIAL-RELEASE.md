# Editorial taxonomy release

Additive migration `20261104_060000`: category hierarchy, post taxonomy relations,
Vietnam/Germany tags and one canonical knowledge source per opted-in article.
Published + approved + AI checked is required. Unchecking/drafting withdraws the
source in the same database transaction; deleting the article removes its source.
The existing outbox worker handles indexing/removal and query-time eligibility
checks protect answers while the queue catches up. No customer messages indexed.

Use `release-reviewed-editorial.py` once with the exact successful-CI branch head
and SHA256 of its sorted compact JSON map (reviewed path -> SHA256 of git show
content stripped at the end, matching Engine.git). It verifies the installed
release policy and protected-path allowlist, obtains the deploy lock, takes the
existing verified backup, builds the immutable image, migrates before the private
candidate, and uses existing health checks and rollback. No installed policy,
compose, credentials, unrelated services or existing articles are replaced.

Seeds: 16 existing legal parent categories, Tin tức with six children, two tags.
Category deletion reparents children and removes associations, preserving posts.
Schema rollback is forward-only to preserve authoring data; previous application
image remains usable with these additive tables and columns.
