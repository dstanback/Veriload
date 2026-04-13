# Contributing to Veriload

## Development Setup

```bash
git clone https://github.com/dstanback/Veriload.git
cd Veriload
npm install
cp .env.example .env.local
# Set DATABASE_URL to a PostgreSQL connection string
npx prisma db push
npm run seed
npm run dev
```

## Branch Naming

Use descriptive branch names prefixed by type:

- `feature/add-carrier-scoring` — new functionality
- `fix/csv-export-escaping` — bug fix
- `refactor/repository-split` — structural change
- `docs/update-readme` — documentation only

## Pull Request Checklist

Before opening a PR, confirm:

- [ ] `npm run lint` passes with no new warnings
- [ ] `npm run build` completes successfully
- [ ] `npm run test` passes (all unit/integration tests)
- [ ] New features include tests
- [ ] No `console.log` left in committed code
- [ ] Commit messages are concise and descriptive

## Code Conventions

### Imports

Use the `@/*` path alias for all project imports:

```typescript
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import type { ShipmentDetail } from "@/types/shipments";
```

### TypeScript

- Strict mode is enabled (`strict: true` in tsconfig)
- Prefer explicit types over `any` — use `unknown` and narrow
- Use Zod for runtime validation at system boundaries

### Components

- **Server components by default** — only add `"use client"` when you need hooks, event handlers, or browser APIs
- Use the `cn()` utility (clsx + tailwind-merge) for conditional class names:
  ```typescript
  import { cn } from "@/lib/utils";
  className={cn("base-classes", condition && "conditional-class")}
  ```
- Use CSS custom properties (`var(--success)`, `var(--muted)`, etc.) for theme-aware colors

### Data Access

All database queries go through `src/lib/repository.ts`. Every query function:
1. Calls `getScopedOrganizationId()` to get the current org
2. Filters by `organizationId` for tenant isolation
3. Maps Prisma models to snake_case TypeScript interfaces

### Testing

- Unit tests go in `tests/lib/`
- API route tests go in `tests/api/`
- E2E tests go in `tests/e2e/`
- Use the `defaultDevStore` from `src/lib/demo-data.ts` for test fixtures
