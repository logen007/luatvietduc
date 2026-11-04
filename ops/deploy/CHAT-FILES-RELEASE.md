# Private conversation attachments

Additive migration090000 stores private file metadata separately from public CMS
media/knowledge. File bytes go to existing R2 under random private-chat keys.
Same-origin POST has streamed10MiB cap,15uploads/actor/minute,100global/minute,
50files/conversation,4files/message,extension+magic checks. Upload and download
check conversation ownership/assignment; internal files are hidden from customers.
Unsent files are readable only by their uploader. No bucket URL or object key is
returned to visitors. Downloads are attachment responses with no-store,nosniff,CSP.

Sending binds ready files transactionally to one message and checks actor,scope,
idempotency. Attachment-only messages work. Customer files invalidate AI generation
and automatically queue specialist review; document contents are never parsed,
indexed or sent to Gemini. Plain-text questions retain the existing FAQ/RAG flow.
The long notice is replaced with a short provider link beside the composer.

Composer supports + picker,drop,paste,upload progress,file chips/removal and retry;
customer and specialist transcripts show authenticated download cards. PDF,DOCX,
UTF8TXT,JPEG,PNG,WebP supported. No conversion/AI reading of documents is claimed.

Backup inventory includes ready private-chat objects and excludes bundled public
interface assets (already part of the immutable application). Upload finalization
respects the existing backup media lock. Saved storage keys use the CMS's expected
_objectkey field with legacy fallback. No provider credential or bucket policy
change. The reviewed release helper preserves installed release policy,lock,
verified backup,CI gate,private candidate and rollback.
