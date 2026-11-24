# Bundled assets in native media list

The previous release only attached a separate gallery and left the real media
collection empty. Add 43 idempotent metadata records referencing existing public
assets, so native media pagination, search, previews and selection use real rows.
No file duplication, R2 write, credential change or storage subscription.

Collection afterRead resolves only the exact bundled filename allowlist to known
same-origin asset paths. Unrecognized/private uploads retain existing R2 behavior.
Bundled records cannot be updated/deleted through normal API access: these assets
belong to the deployed interface. Existing R2 uploads keep owner write/delete
permissions. Remove the separate beforeList gallery to avoid duplicate items.

Migration 080000 is additive and skips an existing filename. Reviewed release
helper preserves the existing deploy lock, verified backup, exact commit CI,
immutable build, private candidate, readiness probe and rollback policy.

Root query failure reproduced: Payload cloud-storage field `_objectKey` resolves
to PostgreSQL `_objectkey`, whereas migration150000 created `_object_key`.
Add the expected column and preserve/backfill any saved value; retain the old
column for compatibility. Validate by real Payload media.find, not just SQL count.
