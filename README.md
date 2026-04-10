# Veriload

Veriload is an MVP for automated Bill of Lading reconciliation and freight invoice matching. This repo contains a Next.js 14 application, typed domain models, prompt templates, Prisma-backed persistence, BullMQ workers, and the first ingestion/extraction/reconciliation workflow.

## What is implemented

- App Router dashboard, shipment list, shipment detail, upload, settings, login, and signup pages
- Prisma schema for the core logistics entities
- Prompt template files for classification, extraction, matching, and dispute email generation
- Local development storage layer for raw files and rendered page images under `.veriload-storage/`
- Manual upload API plus SendGrid-style inbound email webhook parsing
- Anthropic vision classification/extraction with structured validation and fallback heuristics
- Shipment approval and dispute API routes
- Vitest coverage for matching, reconciliation, extraction heuristics, and email parsing

## Local development

```bash
npm install
npm run prisma:generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Copy `.env.example` to `.env.local`, point `DATABASE_URL` at PostgreSQL, run `npm run prisma:push`, and optionally run `npm run seed`. The app supports local file storage by default, with Anthropic and Redis turning on when their environment variables are configured.

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fdstanback%2FVeriload&env=DATABASE_URL,DIRECT_DATABASE_URL,SESSION_SECRET&envDescription=Required%20environment%20variables%20for%20Veriload&project-name=veriload)

### Required environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Pooled PostgreSQL connection string (e.g. Vercel Postgres pooler URL) |
| `DIRECT_DATABASE_URL` | Direct (non-pooled) PostgreSQL connection string for migrations |
| `SESSION_SECRET` | Session signing secret — generate with `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | Your production URL (e.g. `https://veriload.vercel.app`) |

### Optional environment variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Enables AI-powered document extraction and dispute email generation |
| `STORAGE_ENDPOINT` | S3-compatible endpoint for file storage (falls back to local storage) |
| `REDIS_URL` | Enables async document processing queue |
| `SENDGRID_API_KEY` | Enables inbound email document ingestion |

### Database setup

1. **Provision a database**: Use [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres), [Neon](https://neon.tech), or [Supabase](https://supabase.com). Copy the pooled connection string to `DATABASE_URL` and the direct connection string to `DIRECT_DATABASE_URL`.
2. **Push the schema**: After your first deploy, run against your production database:
   ```bash
   npx prisma db push
   ```
3. **(Optional) Seed demo data**:
   ```bash
   npm run seed
   ```

### Post-deploy checklist

- [ ] Set all required environment variables in Vercel dashboard
- [ ] Run `npx prisma db push` against the production database
- [ ] Verify the app loads at your production URL
- [ ] (Optional) Set `ANTHROPIC_API_KEY` to enable AI extraction

## Key directories

- `prisma/schema.prisma`: relational schema for the production data model
- `src/app`: Next.js routes
- `src/components`: dashboard and UI components
- `src/lib`: Prisma repository, auth scope resolution, storage, AI, pipeline, queue, email, and utility modules
- `src/prompts`: versioned prompt templates
- `tests`: core unit tests
