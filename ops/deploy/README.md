# Isolated VPS deployment

Only this Compose project is managed here. The existing root_default Traefik network and the verified websecure/mytlschallenge names are reused; never restart or edit shared proxy services. Database has no host port. Web diagnostic port binds loopback only. Domain routing is limited to luatvietduc.com.

Create .env with umask 077. Generate random DB_PASSWORD (hex) and PAYLOAD_SECRET on the server; never commit them. Configure Google/R2 only through server-side environment. Build this image, start this project's database and web, check localhost:3049/health/ready and then the public HTTPS domain. No provider is activated by filling a client-side setting.

Before updates, run backup.sh, record current RELEASE and image ID, build the new image and run migrations. Migrations must be backward compatible. Rollback code by selecting the previous immutable image tag; do not run database down migrations on real data. Run a restore drill into a separate temporary database, never the live database. Backups on the same VPS are provisional until off-VPS storage is configured.

Google OAuth Web application: authorized redirect URI https://luatvietduc.com/auth/google/callback. Required scopes: openid email profile. Only verified Gmail identities are accepted in this release. Add owner Gmail as a test user while the Google consent screen is in testing. No Gmail/Drive scopes. Create owner offline before opening admin; public first-user registration remains blocked.

R2 bucket remains private; Payload checks access for file downloads. Use a bucket-scoped object read/write token. Media visibility starts private and only owner publishes it. No confidential customer file upload is enabled in this release. R2 is not an off-VPS backup schedule until separately configured and tested.
