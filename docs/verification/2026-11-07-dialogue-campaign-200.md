# 200 stored dialogue simulations — 2026-11-07

`npm run test:dialogues` executes 200 unique scripts through the native chat
service, real isolated PostgreSQL, CMS source hooks, indexing/retrieval filters,
assistant reply writer and staff transitions. Only localhost `lvd_test` is allowed.
Gemini/vector HTTP responses are controlled fixtures; this is not a real-model
fluency or legal-accuracy score. Source paragraphs are explicitly synthetic.

Final result: 200 passed, 0 failed, 3,080 messages; 10–44 messages per conversation.
Ten groups contain 20 conversations each: VI investment, DE investment, property
short replies, exams, topic changes, corrections, human intent, second property
cases, long incomplete intake, and unsupported sources/provider failures.
The runner asserts both 200 scripts and uniqueness of actual customer sequences.

Checks include required-data gates before retrieval, expected next fields, no
immediately repeated fixed questions, exact source paragraphs/conditions,
idempotent client keys, explicit handoff, real staff claim/reply and AI stopping
after takeover. Public article/private knowledge alternate; long cases exceed
eight questions. All created conversations/content are removed after the run.

Initial run had 15 failures. Ten were incorrect test expectations: an opener
already said “đang tìm hiểu” (stage supplied) or “góp vốn” (form supplied). The
openers were corrected rather than weakening the intake gate. Five reproduced
one defect across locations: “Kết nối chuyên viên cho tôi” failed to transfer
because “với/đến” was mandatory. The parser now accepts the direct phrase.
Regression tests retain negative and conditional variants. The campaign also
checks a prior conditional fallback followed by this explicit current request.

Separately, 20 synthetic Gemini context/source probes used the installed
connection and verified public default rules, never private rules/customer data.
18 parsed responses, 2 quota failures. These are not 20 stored full conversations.
Incomplete inputs generally elicited concise VI/DE questions; no coverage handed
off; the condition probe preserved both complete original paragraphs. Two raw
context probes asked beyond the required slot or referred to the old property
case. They are not counted as passed end-to-end dialogs: the native first-slot
gate provides its own question before invoking semantic intake on those exact
inputs, covered by the stored campaign. This sample does not establish model
correctness; quota and semantic limitations remain explicitly recorded.

Other checks: 462 unit tests, TypeScript, and the existing native system suite
passed. The latter separately covers consent/private records, source withdrawal,
stale-source races, account ACL and handoff races.

Rerun against the initialized existing test DB: provide DATABASE_URL,
PAYLOAD_SECRET, HTTPS APP_URL and DIALOGUE_REPORT_DIR to npm run test:dialogues
from apps/cms. It resets daily usage only in guarded lvd_test and temporarily
owns its synthetic AI integration. The large synthetic budget cannot alter
production limits. Reports contain complete synthetic transcripts and checks;
real-model outputs remain a separate local artifact. No live deployment is
required to reproduce the 200 controlled simulations.
