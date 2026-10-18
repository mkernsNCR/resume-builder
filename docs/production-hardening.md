# Production hardening rollout

The Express application now requires an account. Register or sign in before
opening the editor. All resume operations, PDF generation and uploads require a
valid session. Each saved resume belongs to one account. Other accounts receive
404 responses for that record; a conflicting create ID receives 409.

## Existing installation

1. Take and verify a backup using [the backup guide](backups.md).
2. Stop application writes during the rollout, then apply the reviewed migration:

   ```sh
   psql "$DATABASE_URL" --set=ON_ERROR_STOP=1 -f ops/sql/0001_resume_owner.sql
   ```

   This adds a nullable ownership column, foreign key and index. It preserves
   every existing resume and the `user_sessions` table. Running it again is safe.
   It is an explicit SQL rollout, separate from Drizzle's generated migration
   journal. `db:push` is a development tool and excludes runtime session tables.
3. Deploy the matching application build and configure `SESSION_SECRET` with at
   least 32 random characters. Use HTTPS in production. Production startup does
   not create sample records.
4. Existing resumes remain unowned and hidden. An administrator must verify the
   owner of each record before assigning it. Do not give all legacy records to
   the first registered account. Legacy records with unsupported template values
   load using the Modern template; the next save persists that supported choice
   while preserving the resume content. Use reviewed, record-specific updates with the
   verified resume and user IDs; preserve a record of the assignment and backup.
5. Confirm that two accounts cannot see each other's data and that a signed-in
   browser remains signed in after reloading.

For a new development database, create the database and run `npm run db:push`.
The migration assumes the pre-existing `resumes` and `users` tables.

## Proxy and TLS configuration

`TRUST_PROXY_HOPS` defaults to `0` and accepts integers from 0 to 5. For exactly
one controlled TLS-terminating proxy, set `TRUST_PROXY_HOPS=1`. The proxy must
preserve the public `Host` and overwrite `X-Forwarded-Proto` and forwarding
headers. Restrict direct access to the Node listener. All ingress paths must
have the configured hop count; do not enable numeric trust for variable proxy
paths or an untrusted upstream.

Production cookies are Secure, HttpOnly and SameSite=Lax. Plain HTTP production
access cannot establish a session. If proxy trust is left at zero behind a
proxy, secure cookies fail and all users can share the proxy's rate-limit
budget. Rate limits are in process memory; multiple Node replicas require a
shared limiter store and a reviewed deployment topology.

State-changing browser requests must have a same-origin `Origin`; cross-site
Fetch Metadata requests are rejected. Non-browser clients may omit Origin.
The editor sends `X-Expected-User-Id` as a consistency check: if another tab has
changed the session account, the server rejects work with `SESSION_USER_CHANGED`.
This header never grants access; the verified session determines the owner.

## Error and privacy contract

API responses use `Cache-Control: no-store`. Unknown API paths return JSON 404.
Invalid JSON returns `INVALID_JSON` (400), bodies over 1 MB return
`BODY_TOO_LARGE` (413), and uploaded files over 10 MB return `FILE_TOO_LARGE`
(413). Unsupported/mismatched files return `INVALID_FILE_TYPE` (400), unreadable
or image-only documents return `EXTRACTION_FAILED` (400), and excess multipart
fields/files return `INVALID_UPLOAD` (400). Authentication happens before file
writes. PDF and DOCX are supported; legacy binary DOC is not.

PDF export normalizes its title and download filename to the same limit while
preserving the full resume name in the document. Whitespace-only names retain
the resume.pdf download filename fallback.

Titles are trimmed and bounded to 200 characters. Editor-derived titles use
`Untitled Resume` for whitespace-only names. Duplicates reserve space for the
` (Copy)` suffix. Create IDs remain idempotent within one account.

On session expiry, the browser retains the editor behind a sign-in dialog.
Resume saving only after the same account authenticates. Unacknowledged create
IDs survive suspension so an interrupted successful save is retried without
creating another copy; successful sign-out and document resets discard those IDs.
A failed logout retains the ID for same-user recovery. Authentication-expired
uploads show the sign-in dialog without an extraction-error message. Explicit sign-out
cancels queued work and asks before discarding in-memory edits. Reloading or
closing the page still discards unsaved in-memory edits; no local personal-data
backup is stored.

## Sites compatibility and scope

The optional local Sites integration is separate, pre-existing work and is not
included in this Express hardening PR. It uses platform authentication and can
bypass the local credential gate through `VITE_PLATFORM_AUTH` in its Vite config.
Its backend is unchanged. The existing worker's `private-site-owner` fallback
when no authenticated email header is present needs a separate deployment
review. Do not expose that backend without enforcing authenticated platform
identity. This Express hardening does not certify the Sites backend.

## Verification

Run `npm run check`, `npm run lint`, `npm run test:unit` and `npm run build`.
If the optional local Sites integration is installed, also run its
`npm run build:sites` command. Both builds write to `dist`; run the Express build
again before `npm start` when Sites was the last build.

E2E tests require an explicit disposable PostgreSQL `DATABASE_URL` whose database
name contains `test` or `hardening`. The normal `resume_builder` database is
rejected. Apply the schema only to that test database, then run `npm test` with
that URL. Test fixtures create isolated accounts and clean only their own data.

The production HTTPS smoke can be rerun after the Express build:

```sh
DATABASE_URL=postgresql://localhost:5432/resume_builder_test node --import tsx script/verify-production.ts
```

It requires OpenSSL, installed Playwright Chromium, free localhost ports 55438/55439,
and a pre-created test database with the current schema. It generates and removes
a temporary TLS certificate and cleans its own test account.

Actual hosting still requires verified TLS/ingress, backup restoration drills,
monitoring, resource limits and a versioned migration release process. Add
readiness checks, graceful shutdown and shared rate limits before scaling.
