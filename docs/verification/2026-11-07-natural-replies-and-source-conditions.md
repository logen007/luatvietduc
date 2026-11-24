# Natural replies and grounded-source recovery — 2026-11-07

## Reproduced and fixed

A self reply “Tôi” after the family-role question previously repeated that
question indefinitely. Narrow contextual binding now recognizes explicit VI/DE
self replies only after our family[‑N].parties question. It does not bind “Tôi”
after an unrelated question or rewrite the stored customer message.

“Sổ đỏ là gì?” and “Có sổ đỏ chưa là sao?” previously counted as possession of a
certificate and could admit retrieval prematurely. Definition/status questions
now leave the document slot unresolved. Later actual yes/no facts still resolve
it; a definition question does not erase a fact already supplied. German
Eigentumsnachweis and Grundbuchauszug are recognized as document mentions, with
question/statement distinction. Native stored conversations verify both fixes.

The real Gemini source probes selected correct full source paragraphs but omitted
mandatory conditions, causing unnecessary handoff. completeSourceSelection first
runs existing whole-paragraph repair and strict validation. It repairs only the
specific Missing source conditions failure by appending original mandatory
paragraphs from the already validated selected sources. It then reruns unchanged
strict validation. No new source or authored legal claim is added; malformed or
invented quotes, weak scores, duplicate passages, unselected sources, paragraph
counts and total answer limits still fail. No second model request is needed.
Native tests now distinguish recoverable exact-source omission from genuinely
unsupported responses; the 200-dialogue campaign keeps its failure cases using
wrong source keys rather than the now-recoverable omission.

## Verification

476 unit tests, TypeScript, native system suite and 200 stored dialogue
simulations passed (3,080 messages, real isolated SQL/CMS, mocked provider HTTP).
The native matrix also tests self-role completion, two successive document
questions with no retrieval, and retrieval only after an actual yes/no reply.
Source edit/withdrawal races, private-source checks and staff takeover remain.

Four new synthetic multi-turn intake conversations used Gemini with public
default rules: VI and DE divorce/property with short self replies; VI and DE
property-document questions. Nine real intake calls, all four reached the local
ready-for-retrieval state. Each case capped model calls at three; fixed questions
and ready markers are explicitly marked in the local report.

Four separate real-model selection probes tested opening answer, VI follow-up,
DE follow-up and absent coverage. Final results: three exact-source answers with
all mandatory paragraphs, one handoff, zero provider/parser errors. Earlier raw
omission failures are retained locally. Sources are explicitly synthetic process
examples, not legal guidance or real customer records. This verifies behavior on
these samples, not universal fluency or legal accuracy. Editable business rules
remain in Kiến thức AI → Quy tắc trả lời; evidence validation stays enforced.
