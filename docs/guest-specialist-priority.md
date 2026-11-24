Guest specialist intake: signed-in requests rank above anonymous queued requests;
assigned conversations stay first and FIFO inside each group. Registered flag only,
no account email exposed to unassigned staff. Guest prompt links direct Google login
with signed conversationId; callback validates existing identity/nonce/PKCE as before,
links only current HttpOnly guest-cookie conversations, rebinds private file ownership
transactionally, returns only to a fixed chat path after verifying account ownership.
Existing messages/files preserved; previous guest cookie loses access after linking.
No new credentials, OAuth scopes, tables or migration. Tests cover wrong browser,
second-account takeover denial, file ownership and registered-over-older-guest queue.
