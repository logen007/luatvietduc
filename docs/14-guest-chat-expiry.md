# Guest chat inactivity expiry

`guest_expiry_enabled` is independent from intake qualification and the legacy
`retain_history` flag. An AI-only guest session receives a real two-hour expiry
on creation. A new customer or assistant message renews it; an idempotent retry
does not. Renaming an owned temporary session also renews it. Qualification,
retrieval admission and completion of an AI answer do not cancel the deadline.

Verified account linking, specialist handoff/claim/closure and beginning a file
upload disable automatic expiry permanently for that history. Cancelling an
upload does not undo protection. The sweep independently checks ownership,
files, staff messages, assignments, active AI leases and row locks before
cascading only the eligible conversation's SQL data. The inbox uses that same
expiry policy and existing red seconds counter; account history has no counter.

The additive migration introduces the explicit flag and updates the existing
PostgreSQL guards. It deletes no records. Existing eligible AI-only guests
created after the original expiry migration receive a full two-hour grace
period. Older protected archives, accounts, files and human-handled histories
are preserved. The migration's eligibility excludes prior human lifecycle events.

Old application code can coexist with the additive schema during promotion;
its cleanup may under-delete until the new worker starts. Rollback keeps the
column/guards and previous app image; down migration refuses to remove retention
metadata. Use the existing reviewed migration release helper with the exact
commit and migration checksum. Candidate health, promotion lock and rollback
remain enabled; backups keep their separate 03:00 schedule.
