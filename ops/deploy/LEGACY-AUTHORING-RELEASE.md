# Existing content authoring import

One-time additive data migration 20261104_070000 imports the preserved prototype's
27 sample articles and 303 title-only topics as draft, unapproved, AI disabled.
Preserve exact existing text; empty topic bodies remain empty. Never overwrite a
slug already managed in CMS. Create native Payload draft versions and category/tag
relations so the normal admin draft list can retrieve/edit imported posts.

The file library adds a static gallery of 43 existing public bundled assets above
the existing uploaded-file list. It references existing URLs; no extra file copy,
R2 subscription, upload credential, or storage policy change. Uploads retain their
existing access controls and require a configured R2 connection.

The permalink field generates client-side from a new post's title, permits manual
editing, and freezes existing URLs. Server-side normalization remains in place.

Use release-reviewed-legacy.py with exact successful-CI head and reviewed manifest;
it uses the existing deployment lock, backup, immutable build, private candidate,
health checks and rollback without changing installed release policies.
