# Contextual intake and quiet message labels — 2026-11-07

The customer transcript no longer repeats the brand above every assistant
message. Timestamps remain; staff replies retain the actual author name.
The website header/brand and stored message roles are unchanged.

A meaningful follow-up in the same case may now request contextual model wording
for the next missing field, rather than only after that field has been asked
before. The local completeness gate still rejects premature ready assessments,
never retrieves before required facts, and falls back without handing off when
intake generation fails. Explicit new cases and retracted facts remain locally
gated. Consent, budgets, provider/rule revision checks and staff races remain.

Intake receives the active case's consented customer context, plus the required
field's readable question and detail category. Old owners from a different
property case no longer enter this intake prompt. Model questions about another
category, or an extra goal while a specific field is missing, use the fixed
same-field fallback. This protocol enforces the existing shared intake/voice
rules; the editable business rules remain in Kiến thức AI → Quy tắc trả lời.

Fixed family questions refer to divorce/property concern and stage, with a
short role question. “Đã ly hôn” and “Bereits geschieden” supply the stage;
Vermögensaufteilung supplies the German family concern. Repeated stage fallback
questions stay on stage rather than asking the overall goal again. A question
such as “Bạn hỏi ai đang đứng tên à?” does not supply a property's owner;
explicit later uncertainty still withdraws an earlier ownership fact.

Verification: 469 unit tests, TypeScript and native system suite passed.
The 200-dialogue campaign passed again with 3,080 stored messages, mocked provider
HTTP and real isolated PostgreSQL/CMS hooks. This remains a flow regression test,
not a real-model fluency score.

Separately, six synthetic multi-turn intake conversations used the installed
Gemini connection and verified public default rules: VI divorce/property, DE
divorce/property, short land replies, failed exam, investment correction and two
distinct property cases. Final run made 18 actual model calls, used 14 generated
questions, used fixed fallbacks on rejected/repeated/ready assessments, had zero
provider errors, and all six reached the local ready-for-retrieval state. Each
case capped real calls at three; later questions could therefore be fixed.
No customer records, private rules or actual case documents were used.
The local TXT/JSON report marks generated questions versus fallback questions;
it does not claim legal answer fluency or coverage of every real-world case.
