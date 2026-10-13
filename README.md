# Chartwells PTO

React reconstruction of the deployed Chartwells PTO app at https://d2hxxrhfzq1k3r.cloudfront.net/, with Supabase authentication, queries, and RPC mutations. The recovered deployment supplied the screen behavior and styles; bundled vendor code was replaced with package imports and application code restored to editable JSX. Some local variable names remain from the compiled build. The previous localStorage demo is preserved in Git history.

## Run

Use Node.js 22 or newer and pnpm 11.

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
# Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local
pnpm dev
```

Only the public anon/publishable key belongs in Vite environment variables. Service-role keys belong in the server environment. Users sign in with real Supabase accounts and require a matching profile. Without configuration, the login page explains the missing connection.

```sh
pnpm check
pnpm test
pnpm build
pnpm preview
```

Deploy `dist/` with an SPA fallback to `index.html` for client routes. Set the two Vite variables at build time. No deployment or production database mutation is performed by these commands.

## AWS deployment

The live site is CloudFront distribution `E28QGWFC6YNZD5` in AWS account `836548369971`. Its frontend is in S3 bucket `chartwells-pto-app-836548369971`; Supabase runs on EC2 instance `i-0ab29bf3040dc6657` in `us-east-2`. The deployment script checks those targets before changing anything.

With AWS CLI access and `.env.local` set to the live CloudFront Supabase URL and public anon key:

```sh
aws login
node scripts/deploy-aws.mjs --dry-run
node scripts/deploy-aws.mjs
```

The script runs the source check and production build, backs up the mounted `employee-access` Edge Function, installs it through Systems Manager, and restarts its container. It then backs up `index.html`, uploads hashed assets to S3, publishes the new index, and invalidates CloudFront. It keeps earlier hashed assets so cached pages continue to work. Use `--frontend-only` or `--function-only` when deploying one part. Function backups remain beside the live file on EC2; index backups are under `deploy-backups/` in S3. Database migrations are deployed separately.

## Data flow and refresh behavior

`src/data/supabaseDataSource.jsx` implements the recovered table and RPC contract. `src/data/mappers.jsx` maps database rows into UI records. `src/context/AuthContext.jsx` manages sessions and clears cached data when the account changes.

TanStack Query owns server state. `src/hooks/useResource.jsx` subscribes screens to cached data; `src/lib/queryClient.js` deduplicates underlying reads. Successful writes invalidate subscribed views, while configuration writes also refresh the shared catalog. Existing content stays visible during background refresh, with an updating indicator and retry UI for errors. Failed writes retain the current data. Mutation controls prevent duplicate submissions. Legacy detail consumers can subscribe to the shared revision signal without manually bumping a refresh counter.

Balance calculations share grant, request, and working-calendar reads. CSV exports escape quoted cells and spreadsheet formula prefixes. Keyboard focus and reduced-motion styles are included.

## Supabase setup

For the existing deployment, use its Supabase project and verify the recovered table/RPC contract against that project's schema. The frontend bundle cannot reveal the original RLS policies or database function bodies.

For a **new, empty Supabase project**, `supabase/migrations/202609080001_recovered_contract.sql` supplies a reconstructed schema, row-level access rules, and request/configuration RPCs. Do not apply this bootstrap unchanged over an existing production schema. See [backend setup](supabase/README.md) for provisioning and limitations.

## Verification

Automated tests cover query deduplication/invalidation, failed writes, data-source errors and partial bulk decisions, dates and schedules, CSV escaping, and PostgreSQL request/RLS behavior using PGlite. The SQL tests execute the supplied migration, not the deployed database's unknown implementation.

Browser checks used an isolated in-memory Supabase-shaped fixture, including submission, approval, cancellation, navigation, calendar modes, reports, settings, and responsive layout. To run that fixture:

```sh
pnpm test:fixture
# In another terminal:
VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_ANON_KEY=fixture-anon-public-key pnpm dev
```

Sign in as `jordan@example.test` with any password. Fixture changes reset when its server restarts. It is only a local test service and must not be deployed. Live Supabase mutations and Edge Function deployment require a configured staging project before rollout.

`PRODUCT.md` and `DESIGN.md` retain the original product/design notes; this README describes the current implementation.
