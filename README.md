# Veriload

**AI-powered freight bill reconciliation for logistics back-offices.**

[![CI](https://github.com/dstanback/Veriload/actions/workflows/ci.yml/badge.svg)](https://github.com/dstanback/Veriload/actions/workflows/ci.yml)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fdstanback%2FVeriload&env=DATABASE_URL,DIRECT_DATABASE_URL&envDescription=Required%20environment%20variables%20for%20Veriload&project-name=veriload)

<!-- Add screenshot: run `npm run dev`, seed with `npm run seed`, then capture the dashboard at /dashboard -->
<!-- ![Veriload Dashboard](docs/screenshot.png) -->

---

## The Problem

Manual freight bill reconciliation is slow, error-prone, and costs logistics companies thousands of dollars in undetected overpayments every month. Most mid-sized 3PLs still compare carrier invoices to bills of lading in spreadsheets — a tedious process that doesn't scale.

## The Solution

Veriload automates the entire reconciliation workflow. Documents arrive via email or upload, are classified and extracted by AI, automatically matched to shipments, and reconciled in real time. Discrepancies are surfaced instantly with severity levels so ops teams can approve, dispute, or edit in seconds instead of hours.

---

## Key Features

| Feature | Description |
|---|---|
| **AI Document Extraction** | Classify and extract structured data from BOLs, invoices, rate confirmations, and PODs using Anthropic vision models |
| **Automatic Shipment Matching** | Fuzzy matching on BOL#, PRO#, carrier SCAC, and reference numbers to link documents to shipments |
| **Real-Time Reconciliation** | Green / yellow / red severity scoring with configurable tolerance thresholds per field |
| **Approve / Dispute / Edit-Approve** | Three-path review workflow with generated dispute emails, field-level edits, and full audit trail |
| **Inbound Email Ingestion** | SendGrid inbound parse webhook processes carrier emails and auto-queues attachments |
| **Daily Summary Notifications** | Scheduled daily digest with key metrics, needs-review list, and potential savings |
| **Analytics & Reporting** | Savings over time, processing volume, discrepancy trends, carrier performance tables |
| **CSV & PDF Export** | Streaming CSV export and formatted PDF reconciliation reports with filters |
| **Org-Wide Audit Log** | Filterable, paginated activity log with expandable details for every system action |
| **Bulk Actions** | Multi-select shipment approval with parallel processing and progress tracking |
| **Dark Mode & Accessibility** | Full dark mode support, WCAG AA contrast, keyboard navigation, reduced motion |
| **Landing Page & Onboarding** | Animated marketing page with guided onboarding checklist for new organizations |

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Framework** | Next.js 14 (App Router), TypeScript (strict), React 18 |
| **Database** | PostgreSQL, Prisma ORM |
| **Styling** | TailwindCSS, Framer Motion, Lucide Icons |
| **Data** | TanStack Table, Recharts |
| **AI** | Anthropic Claude (vision classification + structured extraction) |
| **Email** | SendGrid (inbound webhooks + outbound transactional) |
| **Queue** | BullMQ + Redis (async document processing) |
| **Storage** | S3-compatible object storage (local fallback) |
| **Testing** | Vitest (unit/integration), Playwright (E2E) |

---

## Architecture

Documents flow through a six-stage pipeline from ingestion to operator review:

```
                    ┌─────────────┐
                    │  Email /    │
                    │  Upload     │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  PDF → Page │
                    │  Rendering  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  AI Classify │  ← BOL / Invoice / Rate Con / POD
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  AI Extract  │  ← Structured fields + confidence
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Match to    │  ← BOL#, PRO#, SCAC fuzzy match
                    │  Shipment    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Reconcile   │  ← Field-by-field comparison
                    │  & Score     │     Green / Yellow / Red
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Dashboard   │  ← Review, Approve, Dispute
                    └─────────────┘
```

For a detailed technical deep dive, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- (Optional) Redis for async processing
- (Optional) Anthropic API key for AI extraction

### Setup

```bash
# Clone the repository
git clone https://github.com/dstanback/Veriload.git
cd Veriload

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local — at minimum set DATABASE_URL

# Push the database schema
npx prisma db push

# Seed demo data (14 shipments with documents and discrepancies)
npm run seed

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The dev server auto-creates a session for `ops@acmefreight.com` — no login required in development.

---

## Testing

```bash
# Unit and integration tests (Vitest)
npm run test

# Watch mode
npm run test:watch

# End-to-end tests (Playwright — requires running dev server + database)
npm run test:e2e
```

The unit test suite covers document matching, reconciliation logic, extraction heuristics, email webhook parsing, and CSV export formatting. E2E tests cover auth pages, dashboard rendering, shipment list interactions, shipment detail workflows, and file upload.

---

## Deployment

### Vercel (recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fdstanback%2FVeriload&env=DATABASE_URL,DIRECT_DATABASE_URL&envDescription=Required%20environment%20variables%20for%20Veriload&project-name=veriload)

### Required Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Pooled PostgreSQL connection string |
| `DIRECT_DATABASE_URL` | Direct PostgreSQL connection string (for migrations) |

### Optional Environment Variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Enables AI document classification and extraction |
| `STORAGE_ENDPOINT` | S3-compatible endpoint (falls back to local `.veriload-storage/`) |
| `STORAGE_ACCESS_KEY` | S3 access key |
| `STORAGE_SECRET_KEY` | S3 secret key |
| `STORAGE_BUCKET` | S3 bucket name |
| `REDIS_URL` | Enables async document processing via BullMQ |
| `SENDGRID_API_KEY` | Enables outbound email (dispute notifications, daily summary) |
| `SENDGRID_WEBHOOK_VERIFICATION_KEY` | Verifies inbound email webhook signatures |
| `NEXT_PUBLIC_APP_URL` | Production URL for absolute links |

### Database Provisioning

Use [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres), [Neon](https://neon.tech), or [Supabase](https://supabase.com). After provisioning:

```bash
npx prisma db push          # Push schema to production
npm run seed                 # (Optional) Load demo data
```

---

## Project Structure

```
Veriload/
├── prisma/
│   └── schema.prisma          # Data model (8 tables)
├── src/
│   ├── app/                   # Next.js App Router pages + API routes
│   │   ├── (auth)/            #   Login, signup
│   │   ├── dashboard/         #   Overview, shipments, analytics, upload,
│   │   │                      #   notifications, settings, audit-log, onboarding
│   │   └── api/               #   REST endpoints (shipments, documents,
│   │                          #   export, ingest, audit-log, webhooks)
│   ├── components/
│   │   ├── dashboard/         #   Shipment table, detail, charts, upload
│   │   ├── landing/           #   Marketing page sections
│   │   ├── layout/            #   Sidebar, header
│   │   └── ui/                #   Card, Badge, Button, Input, Toast, Theme
│   ├── lib/
│   │   ├── ai/                #   Anthropic classification + extraction
│   │   ├── pipeline/          #   PDF rendering, matching, reconciliation
│   │   ├── email/             #   Daily summary builder
│   │   ├── queue/             #   BullMQ client + workers
│   │   ├── utils/             #   Tolerances, normalization, audit labels
│   │   ├── analytics.ts       #   Analytics data aggregation
│   │   ├── auth.ts            #   Session management
│   │   ├── export.ts          #   CSV/PDF generation
│   │   ├── repository.ts      #   Data access layer (1100+ lines)
│   │   └── storage.ts         #   S3 / local file storage
│   ├── prompts/               #   Versioned AI prompt templates
│   ├── hooks/                 #   React hooks (document polling)
│   └── types/                 #   TypeScript type definitions
├── tests/
│   ├── lib/                   #   Unit tests (matching, reconcile, export)
│   ├── api/                   #   API route tests (ingest, email parsing)
│   ├── integration/           #   Pipeline integration tests
│   └── e2e/                   #   Playwright E2E tests
├── .github/workflows/ci.yml  #   CI: unit tests + Playwright E2E
└── playwright.config.ts       #   Playwright configuration
```

---

## License

[MIT](LICENSE)
