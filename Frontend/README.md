# Small Business ERP

## Overview

A frontend shell for a small-business ERP: sales, purchasing, inventory,
customers, suppliers, invoicing, payments, expenses, and reporting, all in
one dashboard. Every page is wired up and navigable, but all data is mock
data held in memory — there is no backend yet.

## Tech Stack

- Next.js (App Router) + TypeScript
- React
- Tailwind CSS v4
- lucide-react (icons)

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/          # sidebar + header layout, one folder per module
│   │   ├── dashboard/
│   │   ├── products/
│   │   ├── inventory/
│   │   ├── sales/
│   │   ├── purchases/
│   │   ├── customers/
│   │   ├── suppliers/
│   │   ├── invoices/
│   │   ├── payments/
│   │   ├── expenses/
│   │   ├── reports/
│   │   └── settings/
│   ├── layout.tsx
│   └── page.tsx              # redirects to /dashboard
├── components/
│   ├── layout/                 # Sidebar, Header, MobileNav
│   ├── navigation/              # NavLink (active-route aware)
│   ├── ui/                      # Button, Card, Badge, Input, Modal, StatCard, PageHeader, EmptyState
│   ├── tables/                  # generic DataTable
│   ├── forms/                   # QuickFormModal (placeholder create forms)
│   └── dashboard/                # SVG charts for the dashboard
├── lib/
│   ├── utils.ts                 # cn, currency/date formatting
│   └── constants.ts             # nav items
├── mock/                        # one file per entity, typed against src/types
└── types/                       # shared domain types
```

## Running Locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000 — it redirects to `/dashboard`.

## Current Scope

Frontend shell only. Every route renders, navigation works, search/filter
on list pages works against the in-memory mock data, and "Add/Create"
buttons open a modal form — but nothing is persisted, and no network
requests are made.

## Future Modules

- Authentication (login, sessions, RBAC)
- Database + API layer
- Real inventory logic (transactional stock updates, ledger)
- Real sales/purchase workflows (stock checks, order state machine)
- Invoicing and payment processing
- Reporting engine
- Audit logs and notifications

## Backend

This frontend is now backed by a real API in `../Backend/` (see
`../Backend.md` for the full spec). To run locally:

1. Start the backend on port 8787 (see `Backend/README.md`).
2. Create `Frontend/.env.local` with:

   ```
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8787/api
   ```

3. `npm run dev` — open http://localhost:3000 and log in with the seeded
   admin credentials printed by the backend seed script.
