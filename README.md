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

## Key directories

- `prisma/schema.prisma`: relational schema for the production data model
- `src/app`: Next.js routes
- `src/components`: dashboard and UI components
- `src/lib`: Prisma repository, auth scope resolution, storage, AI, pipeline, queue, email, and utility modules
- `src/prompts`: versioned prompt templates
- `tests`: core unit tests
