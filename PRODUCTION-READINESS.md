# Production readiness assessment

Reviewed origin/main at 4e3995b26f5006a36035e99e2584b6b87e156994 (fetched 2026-10-18). Existing uncommitted Sites changes are separate and preserved. The Express release blockers below are now addressed in the working tree. Deployment still requires the ownership migration and hosting-specific checks described in docs/production-hardening.md.

## Baseline release blockers addressed

1. **Personal data is public and writable.** `server/routes.ts` registers resume list, read, write, delete, duplicate, analysis and PDF routes without `requireAuth`. `server/storage.ts` has no owner predicates and `shared/schema.ts` has no ownership field. An unauthenticated caller can read or delete every resume. Implement account ownership in the database and every route, including a usable browser authentication flow.
2. **Client ID retries overwrite arbitrary records.** `DatabaseStorage.createResume` uses unconditional `onConflictDoUpdate` on the public client-supplied ID. Preserve legitimate retries while restricting the SQL conflict update to the owner; return a conflict for other owners and unowned legacy rows.
3. **Secure sessions fail behind TLS termination.** `server/auth.ts` correctly sets secure cookies in production, but `server/index.ts` never configures trusted proxies. A proxy forwarding HTTP to Node cannot establish a secure cookie. Configure a precise, opt-in proxy hop count, restrict direct ingress, and verify HTTPS session persistence.
4. **Legacy records have no proven owner.** Migration must preserve and quarantine existing records until an administrator establishes their owners. Automatically granting them to a new account would disclose personal data.

## Baseline reliability findings and remaining operational work

- Request parsing and Multer errors reach a generic 500 handler; unsupported MIME types, oversized files and malformed JSON should produce stable client errors. Multipart resource counts are unbounded and parsing failures can return an empty successful upload.
- Create/update template validation accepts arbitrary strings; titles accept empty or oversized values. Normalize supported templates and title validation consistently.
- Missing API routes return the SPA HTML with 200. Add a JSON API 404 before static routing.
- Production startup seeds sample resumes automatically when empty. Keep demo/test data out of production and make tests own their fixtures.
- API responses lack explicit no-store controls; production script CSP includes unsafe inline and eval allowances.
- Resume list failures appear as an empty sidebar, and background save failures lack a persistent unsaved-state indicator. Add clear recovery feedback as follow-up if not covered by this hardening pass.
- No readiness endpoint, bounded database query timeouts, graceful shutdown or horizontal shared rate-limit store exists. These require explicit operational follow-up before scaled deployment.
- Schema updates use interactive `drizzle-kit push`; establish reviewed versioned migration rollout and rollback procedures before live changes.
- Backup guidance exists in `docs/backups.md`; restoration, TLS, secret management, database access boundaries and production monitoring still need environment-specific verification.

## Baseline proof

- `npm run check`: passed.
- `npm run test:unit`: 134 tests passed, including generation and extraction of real PDFs.
- `npm test`: 68 browser/API tests passed against a disposable PostgreSQL 17 database on localhost port 55437.
- `npm run build`: passed; warnings include oversized frontend bundle, stale Browserslist data, PostCSS metadata and import.meta in the CJS server build.
- `npm run lint`: failed on pre-existing `URL` global in the untracked Sites cleanup script; four React hook warnings.

No live database or deployed service was changed. A separate temporary database cluster is used for verification.


## Implemented improvements

- Every Express resume/upload route now requires a database-verified account; database reads, writes, deletes and conflict updates include owner predicates. Caller ownership fields are stripped. Legacy unowned resumes remain quarantined.
- Added sign-in, registration, explicit sign-out, initial-session error recovery and same-account reauthentication over the retained editor. Save queues are cancelled before account changes and on unmount. Expected-user request headers prevent cross-tab account changes from reading or writing under a different identity.
- Added shared title normalization and supported-template validation, bounded multipart uploads, meaningful parser errors, stable JSON errors/404s, no-store API responses, and same-origin checks for state-changing browser requests.
- Production startup no longer seeds data. Added bounded opt-in proxy trust and removed unsafe script CSP allowances in production while permitting the existing Google font origins.
- Added a reviewed idempotent owner migration outside Drizzle's generated journal and a Drizzle table filter protecting runtime session tables.
- Browser tests now use their own authenticated accounts and require an explicitly configured disposable database. Added real Express/PostgreSQL security regressions and a generated-PDF upload roundtrip. Added a repeatable production HTTPS smoke script.
- Preserved the original tracked user edits byte-for-byte. Two intentional, narrow edits to existing untracked user files: one Vite define in vite.sites.config.ts preserves platform-auth behavior, and one node:url import fixes lint in script/clean-sites-build.mjs. The Sites backend is unchanged.

## Verification after implementation

- TypeScript check passed.
- Lint passed with the same four pre-existing React warnings and no errors.
- Unit tests: 143 passed.
- Browser/API tests: 88 passed (original 68 plus 20 added regressions).
- Express production build and Sites build passed. Sites client output omits the local sign-in gate, proving the platform capability was inlined.
- Manual ownership SQL applied twice successfully to a copy of the baseline schema. Drizzle push subsequently reported no changes, including after real sessions existed. Existing unowned records were preserved.
- Real temporary HTTPS proxy plus Chromium passed production signup, Secure/HttpOnly/SameSite cookies, editor/save/reload, PDF generation, strict script CSP without console violations, JSON 404/no-store, no startup seeding and legacy-data preservation. Command: DATABASE_URL=<disposable test URL> node --import tsx script/verify-production.ts.

## Remaining limits before release

Apply the migration after a verified backup and explicitly assign verified legacy owners. Configure real TLS, secret management and the exact proxy/ingress topology; the temporary localhost proxy is a working reference, not verification of your host. The user-owned Sites worker still has an existing private-site-owner fallback when the platform identity header is absent; that requires a separate platform deployment review.

Operational follow-ups remain: readiness checks and graceful shutdown, database query/resource timeouts, shared rate limits for replicas, isolated document-processing resource limits, pagination for large resume collections, backup restoration drills, monitoring and a versioned deployment process. Background non-authentication save failures still merit a persistent unsaved-state indicator. Existing bundle-size, Browserslist, PostCSS and development-import build warnings remain. Account recovery/password reset is not implemented. No live database was changed and no deployment, commit or push was performed.

Inspection-driven corrections: reauthentication now saves only genuinely dirty content and never creates an unnamed new draft automatically; successful save/load/reset operations maintain the baseline fingerprint. Deleted-user sessions are regenerated, retaining a valid session object for subsequent login, registration or logout. Regressions cover both cases. Local verification used Node 24.3.0; the existing Sites wrangler/miniflare packages declare Node >=22 while CI/.nvmrc still pin Node 20.19.0. Align the Sites runtime/toolchain before adding that build to CI; those pre-existing dependency/runtime choices were preserved.


## Independent inspection and authorized continuation

The prior implementation was approved after three plan-review rounds, one fix
round and two fresh code inspections. Its historical inspected snapshot was
`c735cecdef504bf7b21815470a8a5de20a6b1bc4aec3d50e2c5595fd7bdef330`.
The user then authorized fixing its two low-priority residuals and extending the
loop. Both are now implemented:

1. PDF request titles and browser download filenames use the shared title
   normalizer. Names longer than 200 characters remain intact in the PDF body.
   The browser regression verifies a real download and extracts the generated
   PDF to prove the full name was preserved.
2. A suspended session retains the unacknowledged create UUID. Same-user
   reauthentication reuses that UUID, including when the original create
   committed before its response was interrupted and the editor has newer edits.
   Successful sign-out, document reset/switch and unmount still discard the UUID
   and pending work. The regression commits a real create, delays its response,
   queues newer content, forces an upload 401, signs back in, and checks there is
   one database-backed record with the same ID and the newest content.

The continuation reruns all verification and requires another fresh Claude
inspection. Its final receipt is retained in the local PLAN-REVIEW-LOG.md. Deployment
prerequisites and the existing Sites identity/runtime limitations above still
apply; these local fixes do not configure or deploy the production environment.

Inspection3 also identified a failed-logout variant of the interrupted-create
race and two small messaging/filename issues. Logout now suspends before the
request and discards the pending ID only on success; failed logout recovery
reuses the same ID. Whitespace-only export names retain resume.pdf, and
authentication-expired uploads show the sign-in dialog without a misleading
extraction-error toast. Browser regressions cover these refinements.

Inspection4 refinements also cover authentication-expired export/delete/duplicate
without misleading operation-error toasts. Assigned legacy resumes with unknown
template values now load as Modern and can be edited/saved without losing their
content. Actual session-expiry and directly inserted legacy-row browser tests
verify these integration paths.


## Final continuation receipt

Fresh Claude inspection5: **APPROVED with zero findings**. Final inspected
snapshot: `6a95c8ffe8863bb0f1122145067c228c1a1771568084d0eea4c8bfdb536ab7d5`.
All inspected file hashes were verified unchanged before this documentation-only
receipt. No source/config/test edits followed approval.

Both originally deferred defects and every subsequent inspection finding are
resolved. Verification: 143 unit tests, 88 browser/API tests, type checking,
lint (four existing React warnings), both builds and rebuilt actual HTTPS
production smoke all passed. The reviewer inspected source rather than running
proof commands; host execution supplies the verification evidence. Complete
findings, dispositions, coverage and limitations are retained in the local
PLAN-REVIEW-LOG.md, which is excluded from this PR.

The loop used three plan reviews, four fix rounds and five fresh inspections,
within the user-extended budget. No code-review findings remain in the inspected
Express scope. Deployment prerequisites and existing Sites identity/runtime
limitations listed above still apply. Verification performed no production deployment or live-data migration.
The subsequent user-authorized commit and PR are recorded separately in Git.


## PR packaging scope

Only the Express hardening source, tests, migration and supporting documentation
are included. Pre-existing changes to package.json, package-lock.json,
.gitignore and FEATURE_RECOMMENDATIONS.md remain unstaged. The user's untracked
Sites files and other artifacts remain untracked. The narrow compatibility
additions to vite.sites.config.ts and script/clean-sites-build.mjs remain local
with those user-owned files; they cannot be committed independently of their
untracked baseline. Sites build verification above used that preserved local
integration, while clean-PR verification uses main's original dependency files.

The coordination PLAN.md and raw PLAN-REVIEW-LOG.md are also retained locally
and excluded from the PR; the readiness report and rollout guide provide the
reviewer-facing evidence and deployment contract.

Clean PR packaging verification installed main's unchanged lockfile in an
isolated snapshot: type checking, lint (four existing warnings), 143 unit tests,
88 browser/API tests and the Express production build passed without any local
Sites dependencies or user package changes. The clean install's npm audit
reported 34 pre-existing dependency findings (2 critical, 23 high, 7 moderate,
2 low). Dependency files are unchanged in this PR; those findings need separate
remediation and remain a release consideration.

The production HTTPS smoke also passed in that isolated clean PR snapshot,
including secure cookies, signup/save/reload, PDF, no-store/404, strict script
CSP, no seeding and legacy-data preservation.
