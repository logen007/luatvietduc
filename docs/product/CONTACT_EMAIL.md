# Contact email

The live contact route `/#/lien-he` renders a compact Vietnamese/German email form. The reference prototype remains unchanged. UI and submit behavior are in presentation/legal-runtime-js/00-contact-form.js; the information-page adapters are a separate fragment. Both assemble into the existing legal-runtime.js cache/version contract.

`POST /service/contact` uses the existing same-origin JSON/body-size and rate-limit checks. Server validation limits name/email/subject/message, rejects header controls and the honeypot. Recipients and sender are never selected by the visitor. Messages are sent as plain text, Reply-To is the validated visitor email, and retry uses a stable Resend idempotency key. Only an accepted provider response produces success. No copy is automatically sent to visitor-supplied addresses.

Owner: `/admin/settings/connections` → Resend → optional contact recipient. Blank uses the first owner account email. This uses the existing encrypted vault and needs no new database migration. Resend must be saved, checked and enabled; domain verification must be complete. Until then the form returns an honest unavailable message and points to chat. No production email has been sent as a test for this feature.

Public limits: three attempts per sender/minute, ten global/minute, sixty/day; additionally existing general POST limits apply. Provider retry deduplication lasts 24 hours: https://resend.com/docs/dashboard/emails/idempotency-keys . Payload is not logged or indexed and this module does not persist a separate contact inbox. A provider acceptance confirms sending, not final inbox delivery.
