# Small Business ERP — Backend Specification

This document specifies a complete backend for the existing `Frontend/` ERP
shell. It is written to be handed to an engineer (human or AI agent) and
implemented as-is: folder structure, database schema, every API route with
request/response shapes, business rules, auth, and Vercel deployment
configuration.

**Goal:** replace the frontend's in-memory `mock/*.ts` data with real data
served from this backend, with zero changes to the frontend's visual design
and minimal changes to its data-fetching code.

---

## 0. Repository Layout

The backend lives in a **new sibling folder** next to `Frontend/`, so the
repo becomes:

```text
ERPSH/
├── Frontend/                 # existing Next.js app (unchanged, see §9)
├── Backend/                  # NEW — this spec
│   ├── api/
│   │   └── [[...route]].ts   # single Vercel serverless entrypoint
│   ├── src/
│   │   ├── app.ts
│   │   ├── db/
│   │   │   ├── client.ts
│   │   │   └── collections.ts
│   │   ├── lib/
│   │   │   ├── ids.ts
│   │   │   ├── errors.ts
│   │   │   ├── jwt.ts
│   │   │   ├── password.ts
│   │   │   └── pagination.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── error-handler.ts
│   │   │   └── request-logger.ts
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   └── auth.schema.ts
│   │   │   ├── users/
│   │   │   │   ├── users.routes.ts
│   │   │   │   ├── users.service.ts
│   │   │   │   └── users.schema.ts
│   │   │   ├── products/
│   │   │   │   ├── products.routes.ts
│   │   │   │   ├── products.service.ts
│   │   │   │   └── products.schema.ts
│   │   │   ├── inventory/
│   │   │   │   ├── inventory.routes.ts
│   │   │   │   ├── inventory.service.ts
│   │   │   │   └── inventory.schema.ts
│   │   │   ├── customers/
│   │   │   │   ├── customers.routes.ts
│   │   │   │   ├── customers.service.ts
│   │   │   │   └── customers.schema.ts
│   │   │   ├── suppliers/
│   │   │   │   ├── suppliers.routes.ts
│   │   │   │   ├── suppliers.service.ts
│   │   │   │   └── suppliers.schema.ts
│   │   │   ├── sales/
│   │   │   │   ├── sales.routes.ts
│   │   │   │   ├── sales.service.ts
│   │   │   │   └── sales.schema.ts
│   │   │   ├── purchases/
│   │   │   │   ├── purchases.routes.ts
│   │   │   │   ├── purchases.service.ts
│   │   │   │   └── purchases.schema.ts
│   │   │   ├── invoices/
│   │   │   │   ├── invoices.routes.ts
│   │   │   │   ├── invoices.service.ts
│   │   │   │   └── invoices.schema.ts
│   │   │   ├── payments/
│   │   │   │   ├── payments.routes.ts
│   │   │   │   ├── payments.service.ts
│   │   │   │   └── payments.schema.ts
│   │   │   ├── expenses/
│   │   │   │   ├── expenses.routes.ts
│   │   │   │   ├── expenses.service.ts
│   │   │   │   └── expenses.schema.ts
│   │   │   ├── dashboard/
│   │   │   │   └── dashboard.routes.ts
│   │   │   ├── reports/
│   │   │   │   └── reports.routes.ts
│   │   │   └── settings/
│   │   │       ├── settings.routes.ts
│   │   │       └── settings.schema.ts
│   │   └── types/
│   │       └── index.ts
│   ├── scripts/
│   │   └── seed.ts
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── vercel.json
└── small-business-erp-shell.zip
```

Every module follows the same three-file pattern: `*.routes.ts` (Hono
router + validation wiring), `*.service.ts` (DB access + business logic,
framework-agnostic), `*.schema.ts` (zod schemas for request validation and
the module's TypeScript types). This mirrors the frontend's
feature-oriented layout so both codebases read the same way.

---

## 1. Tech Stack

| Concern              | Choice                                   | Why |
|-----------------------|-------------------------------------------|-----|
| Runtime               | Node.js 20 (Vercel serverless function)  | MongoDB's official driver needs Node APIs, not the Edge runtime |
| Framework              | Hono (`hono`)                            | Requested; tiny, fast, first-class Vercel adapter |
| Language                | TypeScript (strict)                     | Matches frontend |
| Database                | MongoDB (Atlas)                         | Requested; URI supplied via env var |
| DB driver                | `mongodb` official driver (not Mongoose)| Keeps cold starts fast, avoids ODM overhead in serverless; schema is enforced with zod instead |
| Validation                | `zod` + `@hono/zod-validator`          | Type-safe request validation shared with response types |
| Auth                       | JWT (`jose`) + `bcryptjs`              | Stateless, works across two separate Vercel domains without cookie/SameSite issues |
| CORS                        | `hono/cors`                            | Frontend and backend are separate Vercel projects/domains |

Dependencies (`backend/package.json`):

```json
{
  "name": "erp-backend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "dev": "tsx watch src/dev-server.ts",
    "build": "tsc --noEmit",
    "seed": "tsx scripts/seed.ts",
    "lint": "eslint ."
  },
  "dependencies": {
    "hono": "^4.6.0",
    "@hono/zod-validator": "^0.4.0",
    "zod": "^3.24.0",
    "mongodb": "^6.10.0",
    "jose": "^5.9.0",
    "bcryptjs": "^2.4.3"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "tsx": "^4.19.0",
    "@types/node": "^22.0.0",
    "@types/bcryptjs": "^2.4.6"
  }
}
```

`tsx` is used only for local dev (`src/dev-server.ts` — a thin
`@hono/node-server` wrapper) and for running the seed script. Vercel never
runs `npm run dev`; it builds and runs `api/[[...route]].ts` directly.

---

## 2. Environment Variables

Create `backend/.env` locally (never commit it) from `.env.example`:

```bash
# backend/.env.example
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=erp

JWT_SECRET=replace-with-a-long-random-string
JWT_EXPIRES_IN=8h

# comma-separated list of allowed frontend origins
CORS_ORIGINS=http://localhost:3000,https://<your-frontend-project>.vercel.app

NODE_ENV=development
```

On Vercel, set the same keys under **Project Settings → Environment
Variables** for the `backend` project (Production, Preview, and
Development environments). `MONGODB_URI` is the value you'll provide —
never hardcode it in source.

---

## 3. MongoDB Connection (serverless-safe singleton)

Serverless functions can be invoked concurrently and reuse "warm"
containers, so the MongoDB client must be created once and cached — not
reconnected per-request (that exhausts Atlas connection limits in minutes).

```ts
// backend/src/db/client.ts
import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME ?? "erp";

if (!uri) {
  throw new Error("MONGODB_URI is not set");
}

// Cache the client on the Node global object so hot serverless
// invocations reuse the same connection pool instead of opening a
// new one on every request.
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function createClient(): Promise<MongoClient> {
  const client = new MongoClient(uri!, {
    maxPoolSize: 10,
    minPoolSize: 0,
    // Serverless functions have a hard execution time limit; fail fast
    // instead of hanging if Atlas is unreachable.
    serverSelectionTimeoutMS: 8000,
  });
  return client.connect();
}

const clientPromise: Promise<MongoClient> =
  global._mongoClientPromise ?? (global._mongoClientPromise = createClient());

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(dbName);
}
```

```ts
// backend/src/db/collections.ts
import { getDb } from "./client";
import type {
  ProductDoc,
  CustomerDoc,
  SupplierDoc,
  SalesOrderDoc,
  PurchaseOrderDoc,
  InvoiceDoc,
  PaymentDoc,
  ExpenseDoc,
  InventoryTransactionDoc,
  UserDoc,
  CounterDoc,
} from "../types";

export async function collections() {
  const db = await getDb();
  return {
    users: db.collection<UserDoc>("users"),
    products: db.collection<ProductDoc>("products"),
    customers: db.collection<CustomerDoc>("customers"),
    suppliers: db.collection<SupplierDoc>("suppliers"),
    salesOrders: db.collection<SalesOrderDoc>("salesOrders"),
    purchaseOrders: db.collection<PurchaseOrderDoc>("purchaseOrders"),
    invoices: db.collection<InvoiceDoc>("invoices"),
    payments: db.collection<PaymentDoc>("payments"),
    expenses: db.collection<ExpenseDoc>("expenses"),
    inventoryTransactions: db.collection<InventoryTransactionDoc>("inventoryTransactions"),
    counters: db.collection<CounterDoc>("counters"),
  };
}
```

**Required indexes** (create once, e.g. in the seed script or an
`ensureIndexes()` call run on cold start):

```ts
// called once from scripts/seed.ts and optionally on boot
export async function ensureIndexes() {
  const c = await collections();
  await c.users.createIndex({ email: 1 }, { unique: true });
  await c.products.createIndex({ sku: 1 }, { unique: true });
  await c.products.createIndex({ name: "text", sku: "text" });
  await c.customers.createIndex({ email: 1 }, { unique: true, sparse: true });
  await c.customers.createIndex({ name: "text", email: "text" });
  await c.suppliers.createIndex({ companyName: "text", contactPerson: "text" });
  await c.salesOrders.createIndex({ orderNumber: 1 }, { unique: true });
  await c.purchaseOrders.createIndex({ poNumber: 1 }, { unique: true });
  await c.invoices.createIndex({ invoiceNumber: 1 }, { unique: true });
  await c.invoices.createIndex({ customerId: 1 });
  await c.payments.createIndex({ invoiceId: 1 });
  await c.inventoryTransactions.createIndex({ productId: 1, createdAt: -1 });
}
```

---

## 4. Human-Readable Sequential IDs

The frontend's mock data uses IDs like `SO-10291`, `PO-2026-00125`,
`INV-2026-00451`. Preserve that look using a `counters` collection and
atomic `findOneAndUpdate` with `$inc` (safe under concurrency):

```ts
// backend/src/lib/ids.ts
import { collections } from "../db/collections";

const PREFIX: Record<string, string> = {
  salesOrder: "SO",
  purchaseOrder: "PO",
  invoice: "INV",
  payment: "PMT",
  expense: "EXP",
  inventoryTxn: "INV-TXN",
};

const START_SEQ: Record<string, number> = {
  salesOrder: 10001,
  purchaseOrder: 1,
  invoice: 1,
  payment: 8001,
  expense: 501,
  inventoryTxn: 3001,
};

export async function nextSequence(key: keyof typeof PREFIX): Promise<number> {
  const { counters } = await collections();
  const result = await counters.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 }, $setOnInsert: { startedAt: new Date() } },
    { upsert: true, returnDocument: "after" }
  );
  const seq = result?.seq ?? START_SEQ[key];
  return seq;
}

export async function nextOrderNumber(): Promise<string> {
  const seq = await nextSequence("salesOrder");
  return `SO-${seq}`;
}

export async function nextPoNumber(): Promise<string> {
  const seq = await nextSequence("purchaseOrder");
  const year = new Date().getFullYear();
  return `PO-${year}-${String(seq).padStart(5, "0")}`;
}

export async function nextInvoiceNumber(): Promise<string> {
  const seq = await nextSequence("invoice");
  const year = new Date().getFullYear();
  return `INV-${year}-${String(seq).padStart(5, "0")}`;
}

export async function nextPaymentId(): Promise<string> {
  const seq = await nextSequence("payment");
  return `PMT-${seq}`;
}

export async function nextExpenseId(): Promise<string> {
  const seq = await nextSequence("expense");
  return `EXP-${seq}`;
}

export async function nextInventoryTxnId(): Promise<string> {
  const seq = await nextSequence("inventoryTxn");
  return `INV-TXN-${seq}`;
}
```

Every document also keeps MongoDB's own `_id: ObjectId` for internal
references (`customerId`, `productId`, etc.); the human-readable field
(`orderNumber`, `invoiceNumber`, ...) is what the frontend displays and is
exposed to the client as `id` in API responses (see §6).

---

## 5. Data Model

Below, "**Doc**" is the MongoDB shape (internal). "**API**" is the JSON
shape returned to the frontend — it matches
`Frontend/src/types/index.ts` field-for-field so existing UI code needs no
changes beyond swapping the data source (see §9).

### 5.1 `users`

```ts
interface UserDoc {
  _id: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: "admin" | "manager" | "employee";
  phone?: string;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}
```

Never returned with `passwordHash` — see `users.service.ts` `toPublicUser`.

### 5.2 `products`

```ts
interface ProductDoc {
  _id: ObjectId;
  sku: string;
  name: string;
  category: string;
  brand: string;
  purchasePrice: number;
  sellingPrice: number;
  stockQuantity: number;       // current on-hand quantity, kept in sync by inventory transactions
  minimumStockLevel: number;
  unit: string;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

// API shape — identical to Frontend's `Product` type
interface ProductApi {
  id: string;          // = _id.toString()
  sku: string;
  name: string;
  category: string;
  brand: string;
  purchasePrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minimumStockLevel: number;
  unit: string;
  status: "active" | "inactive";
}
```

### 5.3 `customers`

```ts
interface CustomerDoc {
  _id: ObjectId;
  name: string;
  email: string;
  phone: string;
  address?: string;
  taxNumber?: string;
  creditLimit?: number;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}
```

`ordersCount` and `outstandingBalance` in the API response are **computed**,
not stored (see §5.9), so they're always correct even if invoices/payments
change independently.

### 5.4 `suppliers`

```ts
interface SupplierDoc {
  _id: ObjectId;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address?: string;
  taxNumber?: string;
  paymentTerms?: string;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}
```

`outstandingBalance` is computed from purchase orders minus supplier
payments (§5.9).

### 5.5 `salesOrders`

```ts
interface SalesOrderItem {
  productId: ObjectId;
  productName: string;   // snapshot at time of sale, so history reads correctly
  quantity: number;
  unitPrice: number;     // snapshot of sellingPrice at time of sale
  lineTotal: number;
}

interface SalesOrderDoc {
  _id: ObjectId;
  orderNumber: string;          // "SO-10291"
  customerId: ObjectId;
  customerName: string;         // snapshot
  items: SalesOrderItem[];
  subtotal: number;
  tax: number;
  amount: number;                // subtotal + tax
  status: "draft" | "confirmed" | "fulfilled" | "cancelled";
  date: Date;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

`itemsCount` in the API response = `items.length`, computed on the way out.

### 5.6 `purchaseOrders`

```ts
interface PurchaseOrderItem {
  productId: ObjectId;
  productName: string;
  quantity: number;
  receivedQuantity: number;      // starts at 0, incremented by /receive
  unitPrice: number;             // purchasePrice at time of order
  lineTotal: number;
}

interface PurchaseOrderDoc {
  _id: ObjectId;
  poNumber: string;               // "PO-2026-00125"
  supplierId: ObjectId;
  supplierName: string;
  items: PurchaseOrderItem[];
  amount: number;
  status: "draft" | "pending" | "confirmed" | "partially_received" | "received" | "cancelled";
  date: Date;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

### 5.7 `invoices`

```ts
interface InvoiceDoc {
  _id: ObjectId;
  invoiceNumber: string;          // "INV-2026-00451"
  salesOrderId: ObjectId;
  customerId: ObjectId;
  customerName: string;
  amount: number;
  issueDate: Date;
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

`status` (`unpaid | partially_paid | paid | overdue`) is **computed**, not
stored — see §5.9 — so a late payment or a backdated due-date change can
never leave a stale status.

### 5.8 `payments`

```ts
interface PaymentDoc {
  _id: ObjectId;
  paymentNumber: string;          // "PMT-8821"
  invoiceId: ObjectId;
  customerId: ObjectId;
  customerName: string;
  amount: number;
  method: "cash" | "card" | "bank_transfer" | "upi" | "other";
  status: "completed" | "pending" | "failed";
  date: Date;
  createdAt: Date;
}
```

### `expenses`

```ts
interface ExpenseDoc {
  _id: ObjectId;
  expenseNumber: string;          // "EXP-401"
  category: string;
  description: string;
  amount: number;
  date: Date;
  status: "recorded" | "pending_approval";
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

### `inventoryTransactions`

```ts
interface InventoryTransactionDoc {
  _id: ObjectId;
  txnNumber: string;               // "INV-TXN-2201"
  productId: ObjectId;
  productName: string;
  type: "purchase" | "sale" | "return" | "adjustment" | "damage";
  quantity: number;                 // signed: +20 for purchase, -4 for sale
  previousQuantity: number;
  newQuantity: number;              // == "balanceAfter" in the frontend type
  referenceType: "sales_order" | "purchase_order" | "manual";
  referenceId: ObjectId | null;
  createdBy: ObjectId;
  createdAt: Date;
}
```

### `counters`

```ts
interface CounterDoc {
  _id: string;   // "salesOrder" | "purchaseOrder" | "invoice" | "payment" | "expense" | "inventoryTxn"
  seq: number;
}
```

### 5.9 Computed fields (derived, never stored redundantly)

| Field | Formula |
|---|---|
| `Customer.outstandingBalance` | `sum(invoices.amount for customer) - sum(payments.amount where status="completed" for those invoices)` |
| `Customer.ordersCount` | `count(salesOrders where customerId = X and status != "cancelled")` |
| `Supplier.outstandingBalance` | `sum(purchaseOrders.amount where status in [confirmed, partially_received, received]) - sum(supplierPayments.amount where status="completed")` — supplier payments are tracked via `/api/supplier-payments` (Phase 10). |
| `Invoice.status` | `paid` if `paidAmount >= amount`; `partially_paid` if `0 < paidAmount < amount`; else `overdue` if `dueDate < now`; else `unpaid` |
| `SalesOrder.itemsCount` | `items.length` |
| `PurchaseOrder.itemsCount` | `items.length` |

These are computed with a MongoDB aggregation pipeline (`$lookup` +
`$group`) inside each module's `service.ts`, shown in §7.

---

## 6. Response Envelope & Error Format

Every endpoint returns JSON in one of these two shapes:

```ts
// success
{ "data": <T | T[]>, "meta"?: { "page": number, "limit": number, "total": number } }

// error
{ "error": { "code": string, "message": string, "details"?: unknown } }
```

HTTP status codes used: `200` (ok), `201` (created), `204` (deleted, no
body), `400` (validation error), `401` (missing/invalid auth), `403`
(authenticated but not permitted), `404` (not found), `409` (conflict —
e.g. insufficient stock, invalid status transition), `500` (unhandled).

```ts
// backend/src/lib/errors.ts
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

export const NotFound = (entity: string) =>
  new ApiError(404, "NOT_FOUND", `${entity} not found`);

export const Conflict = (message: string, details?: unknown) =>
  new ApiError(409, "CONFLICT", message, details);

export const Forbidden = (message = "You don't have permission to do this") =>
  new ApiError(403, "FORBIDDEN", message);

export const Unauthorized = (message = "Authentication required") =>
  new ApiError(401, "UNAUTHORIZED", message);
```

```ts
// backend/src/middleware/error-handler.ts
import type { ErrorHandler } from "hono";
import { ZodError } from "zod";
import { ApiError } from "../lib/errors";

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof ApiError) {
    return c.json({ error: { code: err.code, message: err.message, details: err.details } }, err.status as 400);
  }
  if (err instanceof ZodError) {
    return c.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid request body", details: err.flatten() } },
      400
    );
  }
  console.error(err);
  return c.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, 500);
};
```

---

## 7. Application Bootstrap

```ts
// backend/src/app.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { errorHandler } from "./middleware/error-handler";

import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/users/users.routes";
import productRoutes from "./modules/products/products.routes";
import inventoryRoutes from "./modules/inventory/inventory.routes";
import customerRoutes from "./modules/customers/customers.routes";
import supplierRoutes from "./modules/suppliers/suppliers.routes";
import salesRoutes from "./modules/sales/sales.routes";
import purchaseRoutes from "./modules/purchases/purchases.routes";
import invoiceRoutes from "./modules/invoices/invoices.routes";
import paymentRoutes from "./modules/payments/payments.routes";
import expenseRoutes from "./modules/expenses/expenses.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import reportRoutes from "./modules/reports/reports.routes";
import settingsRoutes from "./modules/settings/settings.routes";

const app = new Hono().basePath("/api");

app.use(
  "*",
  cors({
    origin: (origin) => {
      const allowed = (process.env.CORS_ORIGINS ?? "").split(",").map((s) => s.trim());
      return allowed.includes(origin) ? origin : allowed[0];
    },
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: false, // bearer-token auth, no cookies needed
  })
);
app.use("*", logger());
app.onError(errorHandler);

app.get("/health", (c) => c.json({ data: { status: "ok", time: new Date().toISOString() } }));

app.route("/auth", authRoutes);
app.route("/users", userRoutes);
app.route("/products", productRoutes);
app.route("/inventory", inventoryRoutes);
app.route("/customers", customerRoutes);
app.route("/suppliers", supplierRoutes);
app.route("/sales", salesRoutes);
app.route("/purchases", purchaseRoutes);
app.route("/invoices", invoiceRoutes);
app.route("/payments", paymentRoutes);
app.route("/expenses", expenseRoutes);
app.route("/dashboard", dashboardRoutes);
app.route("/reports", reportRoutes);
app.route("/settings", settingsRoutes);

export default app;
```

```ts
// backend/api/[[...route]].ts  — the single Vercel serverless entrypoint
import { handle } from "hono/vercel";
import app from "../src/app";

export const runtime = "nodejs"; // mongodb driver requires Node, not Edge

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
export const OPTIONS = handle(app);
```

```ts
// backend/src/dev-server.ts — local development only, not used by Vercel
import { serve } from "@hono/node-server";
import app from "./app";

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Backend running on http://localhost:${info.port}`);
});
```

(Add `@hono/node-server` as a devDependency for this file.)

---

## 8. Auth

### 8.1 Password hashing & JWT helpers

```ts
// backend/src/lib/password.ts
import bcrypt from "bcryptjs";
export const hashPassword = (plain: string) => bcrypt.hash(plain, 10);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);
```

```ts
// backend/src/lib/jwt.ts
import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export interface JwtPayload {
  sub: string;       // user id
  role: "admin" | "manager" | "employee";
  email: string;
}

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN ?? "8h")
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, secret);
  return payload as unknown as JwtPayload;
}
```

### 8.2 Auth middleware & RBAC

```ts
// backend/src/middleware/auth.ts
import type { MiddlewareHandler } from "hono";
import { verifyToken, type JwtPayload } from "../lib/jwt";
import { Unauthorized, Forbidden } from "../lib/errors";

declare module "hono" {
  interface ContextVariableMap {
    user: JwtPayload;
  }
}

export const requireAuth: MiddlewareHandler = async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) throw Unauthorized();
  try {
    const payload = await verifyToken(header.slice(7));
    c.set("user", payload);
  } catch {
    throw Unauthorized("Invalid or expired token");
  }
  await next();
};

export const requireRole =
  (...roles: JwtPayload["role"][]): MiddlewareHandler =>
  async (c, next) => {
    const user = c.get("user");
    if (!roles.includes(user.role)) throw Forbidden();
    await next();
  };
```

Role matrix (mirrors the original product spec):

| Action | admin | manager | employee |
|---|---|---|---|
| View products/inventory/sales/purchases/customers/suppliers | ✅ | ✅ | ✅ |
| Create sales order, customer | ✅ | ✅ | ✅ |
| Create/edit product, purchase order, supplier | ✅ | ✅ | ❌ |
| Delete/deactivate a record | ✅ | ✅ | ❌ |
| View financial reports (`/reports`, `/dashboard` money figures) | ✅ | ✅ | ❌ |
| Manage users, change system settings | ✅ | ❌ | ❌ |

Apply with `app.post("/", requireAuth, requireRole("admin", "manager"), ...)`
per route — the exact per-route matrix is listed in §10.

### 8.3 Auth routes

```ts
// backend/src/modules/auth/auth.schema.ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
```

```ts
// backend/src/modules/auth/auth.routes.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { loginSchema } from "./auth.schema";
import { login, me } from "./auth.service";
import { requireAuth } from "../../middleware/auth";

const app = new Hono();

app.post("/login", zValidator("json", loginSchema), async (c) => {
  const body = c.req.valid("json");
  const result = await login(body.email, body.password);
  return c.json({ data: result });
});

app.get("/me", requireAuth, async (c) => {
  const user = c.get("user");
  const profile = await me(user.sub);
  return c.json({ data: profile });
});

export default app;
```

`POST /api/auth/login` response:

```json
{
  "data": {
    "token": "eyJhbGciOi...",
    "user": { "id": "66f...", "name": "Aditi Nair", "email": "aditi@ledgerly.example", "role": "admin" }
  }
}
```

No `/register` endpoint is exposed publicly — users are created via
`POST /api/users` by an admin (see §10.2). Seed a first admin user via the
seed script (§12) so there's a way to log in initially.

---

## 9. Endpoint Reference

Base URL: `https://<backend-project>.vercel.app/api` (or
`http://localhost:8787/api` locally).

All list endpoints accept `?search=`, `?status=`, `?page=` (default 1),
`?limit=` (default 20, max 100), and return `meta.total` for pagination.
All mutating endpoints (`POST`/`PATCH`/`DELETE`) require
`Authorization: Bearer <token>` unless noted.

### 9.1 Products — `/api/products`

| Method | Path | Auth | Body / Query | Notes |
|---|---|---|---|---|
| GET | `/` | any authenticated user | `?search=&category=&status=&page=&limit=` | search matches `name`/`sku` |
| GET | `/:id` | any | — | 404 if not found |
| POST | `/` | admin, manager | `{ sku, name, category, brand, purchasePrice, sellingPrice, minimumStockLevel, unit, openingStock? }` | `openingStock` (default 0) creates an initial `inventoryTransactions` row of type `adjustment` |
| PATCH | `/:id` | admin, manager | partial of the above (no `stockQuantity` — use inventory endpoints) | |
| DELETE | `/:id` | admin | — | soft delete: sets `status = "inactive"`, does not remove the document (financial history references it) |

Response item (`ProductApi`, matches `Frontend/src/types/index.ts` `Product`):

```json
{
  "id": "66f1a2...",
  "sku": "LAP-DELL-001",
  "name": "Dell Inspiron 15",
  "category": "Laptops",
  "brand": "Dell",
  "purchasePrice": 55000,
  "sellingPrice": 65000,
  "stockQuantity": 17,
  "minimumStockLevel": 5,
  "unit": "unit",
  "status": "active"
}
```

### 9.2 Inventory — `/api/inventory`

| Method | Path | Auth | Body / Query | Notes |
|---|---|---|---|---|
| GET | `/` | any | `?page=&limit=` | same as `GET /products` but always includes `stockQuantity` — used by the Inventory page's "Stock by product" table |
| GET | `/transactions` | any | `?productId=&page=&limit=` | ledger, newest first |
| GET | `/transactions/:productId` | any | — | ledger for one product |
| POST | `/adjustments` | admin, manager | `{ productId, quantity, type: "adjustment" \| "damage", note? }` | manual stock correction; `quantity` is signed (negative for damage/shrinkage). Runs inside a transaction (§9.9) |

Movement response item (`InventoryMovement`, matches frontend type):

```json
{
  "id": "INV-TXN-2201",
  "productName": "Dell Inspiron 15",
  "type": "purchase",
  "quantity": 20,
  "balanceAfter": 30,
  "date": "2026-08-29T00:00:00.000Z"
}
```

### 9.3 Customers — `/api/customers`

| Method | Path | Auth | Body / Query | Notes |
|---|---|---|---|---|
| GET | `/` | any | `?search=&status=&page=&limit=` | search matches `name`/`email` |
| GET | `/:id` | any | — | includes computed `ordersCount`, `outstandingBalance` |
| GET | `/:id/orders` | any | — | that customer's sales orders |
| GET | `/:id/invoices` | any | — | that customer's invoices |
| POST | `/` | any | `{ name, email, phone, address?, taxNumber?, creditLimit? }` | |
| PATCH | `/:id` | admin, manager | partial | |
| DELETE | `/:id` | admin | — | soft delete (`status = "inactive"`) |

### 9.4 Suppliers — `/api/suppliers`

Same shape as customers:

| Method | Path | Auth |
|---|---|---|
| GET `/` | `?search=&status=&page=&limit=` | any |
| GET `/:id` | — | any |
| GET `/:id/purchase-orders` | — | any |
| POST `/` | `{ companyName, contactPerson, email, phone, address?, taxNumber?, paymentTerms? }` | admin, manager |
| PATCH `/:id` | partial | admin, manager |
| DELETE `/:id` | — | admin |

### 9.5 Sales — `/api/sales`

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| GET | `/` | any | `?search=&status=&page=&limit=` | search matches `orderNumber`/`customerName` |
| GET | `/:id` | any | — | includes `items[]` |
| POST | `/` | any | `{ customerId, items: [{ productId, quantity }], tax? }` | **transactional** (§9.9): validates stock for every line, decrements `products.stockQuantity`, inserts one `inventoryTransactions` row per line (`type: "sale"`), creates the order as `status: "confirmed"`, then auto-creates the matching `Invoice` (`status` computed as `unpaid`). Returns `{ order, invoice }`. |
| POST | `/:id/fulfil` | admin, manager | — | transitions `confirmed → fulfilled`. No stock change (already deducted at creation). Rejects if current status isn't `confirmed` (409) |
| POST | `/:id/cancel` | admin, manager | — | transitions any non-terminal status → `cancelled`; if stock had been deducted (order was `confirmed`/`fulfilled`), **reverses it**: inserts a compensating `inventoryTransactions` row (`type: "return"`) restoring the quantity. Rejects if already `cancelled` (409) |

Response item (`SalesOrder`, matches frontend type):

```json
{
  "id": "SO-10291",
  "customerName": "Rahul Sharma",
  "amount": 155760,
  "date": "2026-09-01T00:00:00.000Z",
  "status": "fulfilled",
  "itemsCount": 2
}
```

`GET /sales/:id` additionally includes `items`, `subtotal`, `tax`, and
`customerId`.

### 9.6 Purchases — `/api/purchases`

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| GET | `/` | any | `?search=&status=&page=&limit=` | search matches `poNumber`/`supplierName` |
| GET | `/:id` | any | — | includes `items[]` |
| POST | `/` | admin, manager | `{ supplierId, items: [{ productId, quantity, unitPrice }] }` | creates as `status: "draft"`. No stock change yet. |
| POST | `/:id/confirm` | admin, manager | — | `draft → pending → confirmed` (single call moves straight to `confirmed`, matching the frontend's simplified flow) |
| POST | `/:id/receive` | admin, manager | `{ items: [{ productId, receivedQuantity }] }` | **transactional** (§9.9): for each line, increments `products.stockQuantity` by `receivedQuantity` and inserts an `inventoryTransactions` row (`type: "purchase"`); sets PO status to `partially_received` if any line's total received < ordered, else `received`. Rejects (409) if PO is `draft`, `received`, or `cancelled` |
| POST | `/:id/cancel` | admin, manager | — | `draft/pending/confirmed → cancelled`. Rejects (409) if already `partially_received` or `received` (goods already in stock — must be handled as a return/adjustment instead) |

State machine enforced server-side (matches original spec §12):

```text
draft → pending → confirmed → partially_received → received
                                        ↘________________↗
any of {draft, pending, confirmed} → cancelled
```

Any other transition (e.g. `received → draft`) returns `409 CONFLICT`.

### 9.7 Invoices — `/api/invoices`

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| GET | `/` | any | `?search=&status=&page=&limit=` | `status` filter applies to the **computed** status; search matches `invoiceNumber`/`customerName` |
| GET | `/:id` | any | — | includes `paidAmount`, list of `payments[]` |
| GET | `/:id/pdf` | any | — | *(optional, phase 2 — see §11)* streams a generated PDF |

Invoices are never created directly via POST — they're generated
automatically by `POST /sales` (§9.5). This matches the original spec's
Sales → Invoice flow and avoids duplicate/orphaned invoices.

Response item (`Invoice`, matches frontend type — `status` is computed
per §5.9):

```json
{
  "id": "INV-2026-00451",
  "customerName": "Rahul Sharma",
  "amount": 155760,
  "issueDate": "2026-09-01T00:00:00.000Z",
  "dueDate": "2026-09-15T00:00:00.000Z",
  "status": "paid"
}
```

### 9.8 Payments — `/api/payments`

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| GET | `/` | any | `?search=&status=&page=&limit=` | search matches `paymentNumber`/`invoiceNumber`/`customerName` |
| GET | `/:id` | any | — | |
| POST | `/` | any | `{ invoiceId, amount, method, date? }` | Rejects (409) if `amount` would push `paidAmount` above `invoice.amount` — partial payments are allowed, over-payment is not. Recomputes and returns the invoice's new `status` alongside the created payment. |

Response item (`Payment`, matches frontend type):

```json
{
  "id": "PMT-8821",
  "invoiceId": "INV-2026-00451",
  "customerName": "Rahul Sharma",
  "amount": 155760,
  "method": "upi",
  "date": "2026-09-01T00:00:00.000Z",
  "status": "completed"
}
```

### 9.9 Expenses — `/api/expenses`

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| GET | `/` | admin, manager | `?search=&status=&page=&limit=` | financial data — not visible to `employee` role |
| GET | `/:id` | admin, manager | — | |
| POST | `/` | admin, manager | `{ category, description, amount, date }` | created as `status: "recorded"` (admin) or `"pending_approval"` (manager) |
| POST | `/:id/approve` | admin | — | `pending_approval → recorded` |
| PATCH | `/:id` | admin | partial | |
| DELETE | `/:id` | admin | — | hard delete allowed (non-financial-ledger record, unlike invoices/payments which are never deleted) |

### 9.10 Dashboard — `/api/dashboard`

`GET /api/dashboard` — `admin`, `manager` only (mirrors "employee can't
view sensitive financial reports" from the spec). One aggregated call
backs the whole dashboard page instead of six separate round-trips:

```json
{
  "data": {
    "kpis": {
      "totalSales": 1250000,
      "totalExpenses": 420000,
      "netProfit": 830000,
      "totalOrders": 1245,
      "inventoryValue": 3480000,
      "outstandingPayments": 310000
    },
    "salesTrend": [
      { "label": "Mar", "value": 780000 },
      { "label": "Apr", "value": 910000 }
    ],
    "salesByCategory": [
      { "label": "Laptops", "value": 542000 }
    ],
    "inventoryStatus": { "inStock": 11, "lowStock": 3, "outOfStock": 1 },
    "recentSales": [ /* SalesOrder[] , latest 5 */ ],
    "recentPurchases": [ /* PurchaseOrder[], latest 5 */ ],
    "lowStockProducts": [ /* Product[], lowest stock first, max 5 */ ]
  }
}
```

`salesTrend` = sum of `salesOrders.amount` grouped by month for the last 6
months (`$group` on `$dateToString`). `salesByCategory` = sum of sales
line-item `lineTotal` joined to `products.category`, last 30 days.

### 9.11 Reports — `/api/reports`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/summary` | admin, manager | Powers the Reports landing cards: one object per report type with a headline stat, same numbers as the dashboard KPIs but reusable independently |
| GET | `/sales?from=&to=&groupBy=day\|week\|month` | admin, manager | Time-bucketed sales totals |
| GET | `/inventory` | admin, manager | Valuation, low-stock list, dead-stock (no sales in 90 days) |
| GET | `/expenses?from=&to=&groupBy=category` | admin, manager | |
| GET | `/profit?from=&to=` | admin, manager | `revenue - cogs - expenses` per period, where `cogs` = `sum(salesOrderItems.quantity * product.purchasePrice)` |
| GET | `/customers` | admin, manager | Top customers by lifetime value, outstanding balances |

These endpoints are intentionally read-only aggregations — no new
collections, so the "reporting engine" stays a set of MongoDB aggregation
pipelines rather than a separate system (matches the original spec's "do
not implement a reporting engine" note for phase 1, while still being real
data instead of hardcoded numbers).

### 9.12 Users — `/api/users`

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| GET | `/` | admin | `?search=&role=&status=&page=&limit=` | |
| GET | `/:id` | admin | — | |
| POST | `/` | admin | `{ name, email, password, role, phone? }` | password is hashed before storing; this is how new logins are provisioned (no public signup) |
| PATCH | `/:id` | admin | `{ name?, phone?, role?, status? }` | |
| POST | `/:id/reset-password` | admin | `{ newPassword }` | |
| DELETE | `/:id` | admin | — | soft delete (`status = "inactive"`) — an inactive user's token is rejected on next verification even if not yet expired (checked in `requireAuth` via a DB lookup, or accept the up-to-8h staleness window for simplicity in v1) |

### 9.13 Settings — `/api/settings`

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| GET | `/business` | any | — | single-document collection (`settings` with fixed `_id: "business"`) holding name, tax number, address, contact info, currency |
| PATCH | `/business` | admin | partial | |
| GET | `/notifications` | any | — | per-user notification toggles (`lowStock`, `overdueInvoices`, `receivedPOs`, `supplierPayments`), stored on the user document or a `userPreferences` collection keyed by `userId` |
| PATCH | `/notifications` | any | partial | updates the current user's own toggles |

---

## 10. Business Logic — Transactions & Concurrency

MongoDB **multi-document transactions** (via a `ClientSession`) are used
anywhere more than one collection changes together, so a crash mid-request
can't leave stock and orders out of sync. This requires MongoDB Atlas
(replica set) — a plain standalone `mongod` does not support transactions,
which is one more reason to use Atlas as specified.

### 10.1 Creating a sales order (prevents overselling)

```ts
// backend/src/modules/sales/sales.service.ts (excerpt)
import { getDb } from "../../db/client";
import { collections } from "../../db/collections";
import { Conflict, NotFound } from "../../lib/errors";
import { nextOrderNumber, nextInvoiceNumber, nextInventoryTxnId } from "../../lib/ids";
import { ObjectId } from "mongodb";

export async function createSalesOrder(input: {
  customerId: string;
  items: { productId: string; quantity: number }[];
  tax?: number;
  userId: string;
}) {
  const db = await getDb();
  const session = db.client.startSession();

  try {
    let orderResult;
    await session.withTransaction(async () => {
      const c = await collections();

      const customer = await c.customers.findOne({ _id: new ObjectId(input.customerId) }, { session });
      if (!customer) throw NotFound("Customer");

      const lineItems = [];
      let subtotal = 0;

      for (const item of input.items) {
        // Atomic, condition-checked decrement: fails (matchedCount 0) if
        // stock is insufficient, which is exactly what stops two
        // concurrent sales from over-selling the same 5 units.
        const product = await c.products.findOneAndUpdate(
          {
            _id: new ObjectId(item.productId),
            stockQuantity: { $gte: item.quantity },
          },
          { $inc: { stockQuantity: -item.quantity }, $set: { updatedAt: new Date() } },
          { session, returnDocument: "before" }
        );

        if (!product) {
          const existing = await c.products.findOne({ _id: new ObjectId(item.productId) }, { session });
          throw Conflict(
            existing
              ? `Not enough stock for "${existing.name}" (have ${existing.stockQuantity}, need ${item.quantity})`
              : "Product not found",
            { productId: item.productId }
          );
        }

        const lineTotal = product.sellingPrice * item.quantity;
        subtotal += lineTotal;

        lineItems.push({
          productId: product._id,
          productName: product.name,
          quantity: item.quantity,
          unitPrice: product.sellingPrice,
          lineTotal,
        });

        await c.inventoryTransactions.insertOne(
          {
            _id: new ObjectId(),
            txnNumber: await nextInventoryTxnId(),
            productId: product._id,
            productName: product.name,
            type: "sale",
            quantity: -item.quantity,
            previousQuantity: product.stockQuantity,
            newQuantity: product.stockQuantity - item.quantity,
            referenceType: "sales_order",
            referenceId: null, // filled in below once the order id exists
            createdBy: new ObjectId(input.userId),
            createdAt: new Date(),
          },
          { session }
        );
      }

      const tax = input.tax ?? Math.round(subtotal * 0.18); // matches spec's 18% example
      const amount = subtotal + tax;
      const orderId = new ObjectId();
      const orderNumber = await nextOrderNumber();

      await c.salesOrders.insertOne(
        {
          _id: orderId,
          orderNumber,
          customerId: customer._id,
          customerName: customer.name,
          items: lineItems,
          subtotal,
          tax,
          amount,
          status: "confirmed",
          date: new Date(),
          createdBy: new ObjectId(input.userId),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { session }
      );

      // back-fill referenceId on the inventory rows just created for this order
      await c.inventoryTransactions.updateMany(
        { referenceType: "sales_order", referenceId: null, productId: { $in: lineItems.map((i) => i.productId) } },
        { $set: { referenceId: orderId } },
        { session }
      );

      const invoiceId = new ObjectId();
      const invoiceNumber = await nextInvoiceNumber();
      const issueDate = new Date();
      const dueDate = new Date(issueDate.getTime() + 14 * 24 * 60 * 60 * 1000); // 14-day terms

      await c.invoices.insertOne(
        {
          _id: invoiceId,
          invoiceNumber,
          salesOrderId: orderId,
          customerId: customer._id,
          customerName: customer.name,
          amount,
          issueDate,
          dueDate,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { session }
      );

      orderResult = { orderId, orderNumber, invoiceId, invoiceNumber, amount };
    });

    return orderResult;
  } finally {
    await session.endSession();
  }
}
```

This is Rule 1 and Rule 3 from the original spec made real: *"A sale
cannot be completed if there isn't enough stock"* is enforced by the
condition inside `findOneAndUpdate` (not a separate read-then-write, which
would race), and the whole order+invoice+ledger write is atomic.

### 10.2 Receiving a purchase order

Same pattern in reverse: for each line, `$inc` the product's
`stockQuantity` upward, insert a `purchase`-type ledger row, then compute
the PO's new status from `sum(receivedQuantity) vs sum(quantity)` across
all lines and reject the call entirely (before any writes) if the current
`status` isn't one of `confirmed` / `partially_received`.

### 10.3 Cancelling a sales order

If `status` was `draft`, no stock was ever deducted — just set
`status: "cancelled"`. If it was `confirmed` or `fulfilled`, stock **was**
deducted at creation time, so cancellation must restore it: for each
original line item, `$inc` stock back up and insert a `return`-type ledger
row referencing the order, inside a transaction, before setting
`status: "cancelled"`. This is Rule 2 from the original spec.

### 10.4 Recording a payment

Runs inside a transaction only in the sense of "read invoice + existing
payments, validate, then insert" — no other collection changes, so a
simple `findOne` + guarded `insertOne` is enough (no `session` needed):

```ts
const invoice = await c.invoices.findOne({ _id: invoiceId });
if (!invoice) throw NotFound("Invoice");

const paidSoFar = await c.payments
  .aggregate([{ $match: { invoiceId, status: "completed" } }, { $group: { _id: null, sum: { $sum: "$amount" } } }])
  .toArray();
const alreadyPaid = paidSoFar[0]?.sum ?? 0;

if (alreadyPaid + input.amount > invoice.amount) {
  throw Conflict(`Payment of ${input.amount} exceeds the remaining balance of ${invoice.amount - alreadyPaid}`);
}
```

---

## 11. Validation Pattern (zod)

Every mutating route validates its body with `@hono/zod-validator` before
the handler runs, so bad input never reaches the service layer:

```ts
// backend/src/modules/products/products.schema.ts
import { z } from "zod";

export const createProductSchema = z.object({
  sku: z.string().min(1).max(40),
  name: z.string().min(1).max(120),
  category: z.string().min(1),
  brand: z.string().min(1),
  purchasePrice: z.number().nonnegative(),
  sellingPrice: z.number().nonnegative(),
  minimumStockLevel: z.number().int().nonnegative(),
  unit: z.string().min(1).default("unit"),
  openingStock: z.number().int().nonnegative().default(0),
});

export const updateProductSchema = createProductSchema.partial().omit({ openingStock: true });

export const listProductsQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
```

```ts
// backend/src/modules/products/products.routes.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth, requireRole } from "../../middleware/auth";
import { createProductSchema, updateProductSchema, listProductsQuerySchema } from "./products.schema";
import * as service from "./products.service";

const app = new Hono();

app.get("/", requireAuth, zValidator("query", listProductsQuerySchema), async (c) => {
  const query = c.req.valid("query");
  const { items, total } = await service.listProducts(query);
  return c.json({ data: items, meta: { page: query.page, limit: query.limit, total } });
});

app.get("/:id", requireAuth, async (c) => {
  const product = await service.getProduct(c.req.param("id"));
  return c.json({ data: product });
});

app.post(
  "/",
  requireAuth,
  requireRole("admin", "manager"),
  zValidator("json", createProductSchema),
  async (c) => {
    const product = await service.createProduct(c.req.valid("json"));
    return c.json({ data: product }, 201);
  }
);

app.patch(
  "/:id",
  requireAuth,
  requireRole("admin", "manager"),
  zValidator("json", updateProductSchema),
  async (c) => {
    const product = await service.updateProduct(c.req.param("id"), c.req.valid("json"));
    return c.json({ data: product });
  }
);

app.delete("/:id", requireAuth, requireRole("admin"), async (c) => {
  await service.deactivateProduct(c.req.param("id"));
  return c.body(null, 204);
});

export default app;
```

Every other module (`customers`, `suppliers`, `sales`, `purchases`,
`invoices`, `payments`, `expenses`, `users`) follows this exact three-part
pattern (schema → service → routes). Their schemas are listed in §9's
endpoint tables (the "Body" column) — implement each the same way as the
products example above.

---

## 12. Seeding the Database

`backend/scripts/seed.ts` inserts the same records currently in
`Frontend/src/mock/*.ts` (adjusted to reference real `ObjectId`s instead of
denormalized names only) so the app looks identical to the mock-data
version the first time it's pointed at a real database, plus one admin
user to log in with:

```ts
// backend/scripts/seed.ts (run with: npm run seed)
import "dotenv/config";
import { ObjectId } from "mongodb";
import { collections } from "../src/db/collections";
import { ensureIndexes } from "../src/db/client";
import { hashPassword } from "../src/lib/password";

async function seed() {
  await ensureIndexes();
  const c = await collections();

  await Promise.all([
    c.users.deleteMany({}),
    c.products.deleteMany({}),
    c.customers.deleteMany({}),
    c.suppliers.deleteMany({}),
    c.salesOrders.deleteMany({}),
    c.purchaseOrders.deleteMany({}),
    c.invoices.deleteMany({}),
    c.payments.deleteMany({}),
    c.expenses.deleteMany({}),
    c.inventoryTransactions.deleteMany({}),
    c.counters.deleteMany({}),
  ]);

  const adminId = new ObjectId();
  await c.users.insertOne({
    _id: adminId,
    name: "Aditi Nair",
    email: "admin@ledgerly.example",
    passwordHash: await hashPassword("ChangeMe123!"),
    role: "admin",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // ... insert products/customers/suppliers copied 1:1 from
  // Frontend/src/mock/products.ts, customers.ts, suppliers.ts ...
  //
  // Then, instead of hand-seeding salesOrders/purchaseOrders/invoices/
  // payments/expenses/inventoryTransactions with fabricated ObjectIds,
  // call the real service functions (createSalesOrder, receivePurchaseOrder,
  // recordPayment, createExpense) using the just-inserted product/customer/
  // supplier ids. This guarantees the seeded data is internally consistent
  // (stock, invoice status, computed balances) because it goes through the
  // exact same business logic as the live API.

  console.log("Seed complete. Admin login: admin@ledgerly.example / ChangeMe123!");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

Run it once against a fresh database:

```bash
cd backend
npm install
cp .env.example .env   # fill in your MONGODB_URI
npm run seed
```

---

## 13. Vercel Deployment

### 13.1 `backend/vercel.json`

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "functions": {
    "api/[[...route]].ts": {
      "memory": 256,
      "maxDuration": 15
    }
  }
}
```

No `build` step is required — Vercel detects `api/*.ts` and deploys each
as a serverless function automatically for a project with no framework
preset ("Other"). `tsconfig.json` still needs `"noEmit": false` is **not**
required since Vercel compiles the function itself via its own build
pipeline; keep `tsc --noEmit` as the `npm run build` script purely as a
type-check gate in CI.

### 13.2 Two Vercel projects, one GitHub repo

Both `Frontend/` and `backend/` live in the same `ERPSH` repository. Create
**two separate Vercel projects** pointing at the same repo, each with a
different **Root Directory**:

| Vercel project | Root Directory | Framework preset | Env vars |
|---|---|---|---|
| `erp-frontend` | `Frontend` | Next.js | `NEXT_PUBLIC_API_BASE_URL=https://erp-backend.vercel.app/api` |
| `erp-backend` | `backend` | Other | `MONGODB_URI`, `MONGODB_DB_NAME`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGINS` |

Set `CORS_ORIGINS` on the backend project to the frontend's real deployed
URL (and `http://localhost:3000` for local dev against the deployed
backend). Set `NEXT_PUBLIC_API_BASE_URL` on the frontend project to the
backend's real deployed URL. Redeploy both after setting env vars.

> **Alternative (same-origin, zero CORS):** instead of two domains, deploy
> only the `Frontend` project and add a `Frontend/vercel.json` rewrite:
> `{ "rewrites": [{ "source": "/api/:path*", "destination": "https://erp-backend.vercel.app/api/:path*" }] }`.
> The browser then only ever talks to one origin. This is optional — the
> two-project setup above is simpler to reason about and is what the rest
> of this document assumes.

---

## 14. Frontend Integration Changes

The UI, styling, and component structure built in `Frontend/` do **not**
change. Only the data source changes: list/detail pages currently do
`import { products } from "@/mock/products"` — swap that for a fetch
against this backend. Concretely:

1. **Add an API client.** `Frontend/src/lib/api.ts`:

   ```ts
   const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787/api";

   function getToken(): string | null {
     if (typeof window === "undefined") return null;
     return localStorage.getItem("erp_token");
   }

   export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
     const token = getToken();
     const res = await fetch(`${API_BASE}${path}`, {
       ...init,
       headers: {
         "Content-Type": "application/json",
         ...(token ? { Authorization: `Bearer ${token}` } : {}),
         ...init?.headers,
       },
       cache: "no-store",
     });
     const json = await res.json();
     if (!res.ok) throw new Error(json.error?.message ?? "Request failed");
     return json.data as T;
   }
   ```

2. **Add `NEXT_PUBLIC_API_BASE_URL`** to `Frontend/.env.local` for dev and
   to the Vercel project's env vars for production (§13.2).

3. **Replace mock imports with data fetching.** Since the current pages
   (`products/page.tsx`, `sales/page.tsx`, etc.) are Client Components
   (`"use client"`) that filter mock arrays with `useState`/`useMemo`,
   the smallest change is to fetch once in a `useEffect` on mount and keep
   the existing filter logic as-is:

   ```tsx
   const [products, setProducts] = useState<Product[]>([]);
   useEffect(() => {
     apiFetch<Product[]>("/products").then(setProducts).catch(console.error);
   }, []);
   ```

   Server Components (like the current `inventory/page.tsx`, which is not
   `"use client"`) can instead `await apiFetch(...)` directly in the async
   page function — no `useEffect` needed there.

4. **Wire the `QuickFormModal` submit handlers** (currently just call
   `setOpen(false)`) to call `apiFetch("/products", { method: "POST", body: ... })`
   etc., then re-fetch or optimistically update local state.

5. **Add a login page** (`Frontend/src/app/(auth)/login/page.tsx`, outside
   the `(dashboard)` layout group) that posts to `/auth/login`, stores the
   returned token in `localStorage`, and redirects to `/dashboard`. Add a
   small `useAuth()` hook that redirects to `/login` if no token is
   present, and reads `/auth/me` to know the current user's role (for
   hiding admin-only nav items / actions).

None of this requires changing `types/index.ts` — the backend's API
responses are shaped to match those types exactly (§5), so `Product`,
`Customer`, `SalesOrder`, etc. keep working as the single source of truth
for both ends.

---

## 15. Local Development (both projects together)

```bash
# terminal 1 — backend
cd backend
npm install
cp .env.example .env        # fill in MONGODB_URI
npm run seed                 # one-time
npm run dev                  # http://localhost:8787

# terminal 2 — frontend
cd Frontend
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:8787/api" >> .env.local
npm install
npm run dev                  # http://localhost:3000
```

---

## 16. Build Order (suggested implementation phases)

Mirrors the original project's phased roadmap, scoped to this backend:

1. **Foundation** — `db/client.ts`, `db/collections.ts`, `lib/ids.ts`,
   `lib/errors.ts`, `app.ts`, `api/[[...route]].ts`, health check, auth
   module, users module. Deploy to Vercel, confirm `/api/health` responds.
2. **Catalog & inventory** — products, inventory (ledger + adjustments).
3. **Parties** — customers, suppliers (with computed balances).
4. **Sales & purchasing** — sales orders (§10.1), purchase orders + receive
   (§10.2), the transactional stock logic.
5. **Billing** — invoices (auto-created), payments, computed invoice
   status.
6. **Finance** — expenses.
7. **Reporting** — dashboard aggregation, reports aggregations.
8. **Frontend cutover** — implement §14 in `Frontend/`, point it at the
   deployed backend, retire `src/mock/*`.
9. **Hardening** — rate limiting (`hono` has no built-in limiter; use a
   small in-memory token bucket per IP for a single-instance MVP, or
   Upstash Redis if you need it to work across concurrent function
   instances), audit log collection + middleware that writes one row per
   mutating request, PDF invoice generation, supplier-payment tracking to
   make `Supplier.outstandingBalance` fully accurate (§5.9 note).

---

## 17. Summary of Guarantees

- **No overselling**: stock decrements are atomic, condition-checked
  `findOneAndUpdate` calls inside a MongoDB transaction (§10.1).
- **No orphaned writes**: any operation that touches more than one
  collection (create sale, receive PO, cancel sale) runs inside a
  `ClientSession` transaction — it fully succeeds or fully rolls back.
- **No stale computed data**: `Invoice.status`, `Customer.outstandingBalance`,
  `Supplier.outstandingBalance`, and `*.itemsCount` are computed on read,
  never cached in a way that can drift from the underlying ledger.
- **No accidental deletes of financial history**: products, customers,
  suppliers, sales orders, purchase orders, invoices, and payments are
  never hard-deleted — only deactivated (`status: "inactive"`) or moved to
  a terminal status (`cancelled`). Only non-ledger records (draft
  expenses) support hard delete.
- **Serverless-safe**: the MongoDB client is a cached singleton (§3), so
  Vercel's function reuse doesn't leak connections; every route is a plain
  `async` handler with no in-memory state between requests.

---

## 18. Implementation Checklist

A single, ordered checklist of every concrete task required to take the
repo from "frontend shell with mock data" to "fully wired real-data ERP on
Vercel". Items are grouped by phase (§16) and cross-referenced to the
spec section they implement. Tick only when the file / behaviour exists,
runs locally, and (where applicable) has been exercised end-to-end against
the seeded database.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocker / issue

### Phase 0 — Repo & housekeeping

- [x] Create the sibling `Backend/` directory at the repo root (next to `Frontend/`).
- [x] Add a top-level `.gitignore` entry that ignores `Backend/node_modules`, `Backend/.env`, `Backend/dist`, `Backend/.vercel`, `Frontend/.next`, `Frontend/.env.local`.
- [x] Remove the stray `Frontend/src/{types,lib,mock,components` directory created by shell-globbing (verify it contains no real files first).
- [x] Confirm `Frontend/README.md` is updated to mention the new backend and `NEXT_PUBLIC_API_BASE_URL` env var.
- [x] Decide and document: two-project Vercel setup (default) vs single-project `rewrites` alternative (§13.2). Record the decision in this checklist.
  - **Decision: two-project setup.** Easier CORS reasoning, independent deploys, matches the spec's primary recommendation. Document the `rewrites` alternative in `Backend/README.md` for future opt-in.
- [!] Provision a MongoDB Atlas cluster (free M0/M2 tier is enough for dev) — must be a **replica set** (all Atlas tiers are; standalone `mongod` won't support transactions). *Blocked on user: requires Atlas account, project name, and DB-user credentials. Once provided, set `MONGODB_URI` and `MONGODB_DB_NAME` in `Backend/.env` and Atlas Network Access to `0.0.0.0/0` for dev.*

### Phase 1 — Foundation (§1, §2, §3, §6, §7, §8)

**Tooling & config**
- [x] `Backend/package.json` — name `erp-backend`, `type: "module"`, `engines.node >= 20`, scripts: `dev`, `build` (`tsc --noEmit`), `seed`, `lint` (ESLint).
- [x] `Backend/package.json` deps: `hono@^4.6`, `@hono/zod-validator@^0.4`, `zod@^3.24`, `mongodb@^6.10`, `jose@^5.9`, `bcryptjs@^2.4`, `dotenv@^16` (used by seed).
- [x] `Backend/package.json` devDeps: `typescript@^5.6`, `tsx@^4.19`, `@types/node@^22`, `@types/bcryptjs@^2.4.6`, `@hono/node-server@^1` (local dev only), `eslint`, `@typescript-eslint/*`, `dotenv` if not in deps.
- [x] `Backend/tsconfig.json` — strict, `target: ES2022`, `module: ESNext`, `moduleResolution: bundler`, `noEmit: true`, paths matching `@/*` → `src/*`.
- [x] `Backend/eslint.config.mjs` — flat config matching frontend's style.
- [x] `Backend/.env.example` — `MONGODB_URI`, `MONGODB_DB_NAME`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGINS`, `NODE_ENV`.
- [x] `Backend/.gitignore` — `node_modules`, `.env`, `dist`, `.vercel`, `*.log`.

**Database connection**
- [x] `Backend/src/db/client.ts` — cached-singleton `MongoClient`, `maxPoolSize: 10`, `serverSelectionTimeoutMS: 8000`, throws if `MONGODB_URI` missing.
- [x] `Backend/src/db/client.ts` — `getDb(): Promise<Db>` returning `client.db(dbName)`.
- [x] `Backend/src/db/collections.ts` — typed `collections()` factory returning `users`, `products`, `customers`, `suppliers`, `salesOrders`, `purchaseOrders`, `invoices`, `payments`, `expenses`, `inventoryTransactions`, `counters` collections.
- [x] `Backend/src/db/ensureIndexes.ts` (or function inside `client.ts`) — creates: `users.email` unique, `products.sku` unique, `products` text on `name+sku`, `customers.email` unique sparse, `customers` text on `name+email`, `suppliers` text on `companyName+contactPerson`, `salesOrders.orderNumber` unique, `purchaseOrders.poNumber` unique, `invoices.invoiceNumber` unique, `invoices.customerId`, `payments.invoiceId`, `inventoryTransactions` compound `{productId:1, createdAt:-1}`.
- [x] Decide whether `ensureIndexes()` runs on every cold start (cheap, idempotent) or only via seed script (faster cold starts) — document choice.
  - **Decision: called from the seed script (Phase 11).** Cold-start paths in `app.ts`/`api/[[...route]].ts` do NOT call `ensureIndexes()` to keep warm-function spin-up fast; indexes are created once by the seed. Acceptable because the collections and index list are static for v1.

**Lib utilities**
- [x] `Backend/src/lib/errors.ts` — `ApiError` class + factories `NotFound`, `Conflict`, `Forbidden`, `Unauthorized`.
- [x] `Backend/src/lib/password.ts` — `hashPassword` (bcrypt, cost 10), `verifyPassword`.
- [x] `Backend/src/lib/jwt.ts` — `JwtPayload` interface (`sub`, `role`, `email`); `signToken` (HS256, exp `JWT_EXPIRES_IN`); `verifyToken` (throws on invalid).
- [x] `Backend/src/lib/pagination.ts` — `parsePagination(query) => { page, limit, skip }` with defaults 1 / 20 and max 100.
- [x] `Backend/src/lib/ids.ts` — `nextSequence(key)`, `nextOrderNumber` (`SO-{seq}` starting at 10001), `nextPoNumber` (`PO-{year}-{seq:05d}` starting at 1), `nextInvoiceNumber` (`INV-{year}-{seq:05d}` starting at 1), `nextPaymentId` (`PMT-{seq}` starting at 8001), `nextExpenseId` (`EXP-{seq}` starting at 501), `nextInventoryTxnId` (`INV-TXN-{seq}` starting at 3001). All atomic `findOneAndUpdate` upserts on `counters` collection.
- [x] `Backend/src/types/index.ts` — every `*Doc` interface matching §5 exactly, plus API-shape aliases where helpful (e.g. `ProductApi`).

**Middleware**
- [x] `Backend/src/middleware/auth.ts` — `requireAuth` (verifies Bearer token, populates `c.user`), `requireRole(...roles)` (403 on mismatch), augments `Hono.ContextVariableMap`.
- [x] `Backend/src/middleware/error-handler.ts` — handles `ApiError` (preserves status), `ZodError` → 400 with `.flatten()`, unknown → 500 with generic message.
- [x] `Backend/src/middleware/request-logger.ts` — thin wrapper around `hono/logger` that adds a request-id and logs duration.
- [x] Bonus: `zodHook` exported from `error-handler.ts` and wired into every `zValidator` call so validation failures emit the `{ error: { code: "VALIDATION_ERROR", ... } }` envelope instead of the `@hono/zod-validator` default.

**App bootstrap**
- [x] `Backend/src/app.ts` — `new Hono().basePath("/api")`, CORS middleware reading `CORS_ORIGINS`, `hono/logger`, `app.onError(errorHandler)`, `GET /health` returning `{ data: { status: "ok", time } }`, `app.route("/auth", …)` etc. for every module.
- [x] `Backend/api/[[...route]].ts` — Vercel entrypoint: imports `handle` from `hono/vercel`, exports `runtime = "nodejs"`, re-exports `GET/POST/PATCH/DELETE/OPTIONS = handle(app)`.
- [x] `Backend/src/dev-server.ts` — `serve({ fetch: app.fetch, port })` wrapper for local dev (not used on Vercel).
- [x] `Backend/vercel.json` — `{ functions: { "api/[[...route]].ts": { memory: 256, maxDuration: 15 } } }`.
- [x] Verify `curl http://localhost:8787/api/health` returns `{ data: { status: "ok" }}`.

**Auth module (§8)**
- [x] `Backend/src/modules/auth/auth.schema.ts` — `loginSchema` (`email`, `password`).
- [x] `Backend/src/modules/auth/auth.service.ts` — `login(email, password)` returns `{ token, user: publicUser }`; `me(userId)` returns profile. Throws `Unauthorized` on bad credentials, `NotFound` on unknown email after lookup.
- [x] `Backend/src/modules/auth/auth.routes.ts` — `POST /auth/login` (validates body with zod, no auth), `GET /auth/me` (requires auth). Returns `{ data }` envelope.
- [x] Decide "login fails the same way for unknown email vs wrong password" policy to avoid user-enumeration leak (recommended: same generic `Unauthorized("Invalid email or password")` for both).
  - **Implemented:** both unknown email and bad password return identical `401 {"error":{"code":"UNAUTHORIZED","message":"Invalid email or password"}}`. Inactive users get a distinct message ("Account is inactive") — acceptable since admins intentionally know which accounts they deactivated.

**Users module (§9.12)**
- [x] `Backend/src/modules/users/users.schema.ts` — `createUserSchema`, `updateUserSchema`, `resetPasswordSchema`, `listUsersQuerySchema` (search/role/status/page/limit).
- [x] `Backend/src/modules/users/users.service.ts` — `listUsers`, `getUser`, `createUser` (hashes password), `updateUser`, `resetPassword`, `deactivateUser` (soft delete). `toPublicUser` strips `passwordHash`. Reject duplicate email with 409.
- [x] `Backend/src/modules/users/users.routes.ts` — `GET /` (admin), `GET /:id` (admin), `POST /` (admin), `PATCH /:id` (admin), `POST /:id/reset-password` (admin), `DELETE /:id` (admin).
- [~] (Phase 1 nice-to-have) Reject tokens of inactive users in `requireAuth` via a DB lookup cache, or accept the up-to-8h staleness window for v1.
  - **Decision: accept the up-to-8h staleness window for v1** (deferred to Phase 10 hardening if needed). Stated explicitly so reviewers don't mistake it for an oversight.

**Phase 1 verification**
- [x] `npm run dev` starts on port 8787.
- [x] `curl /api/health` → 200.
- [x] `POST /api/auth/login` with seeded credentials → 200 + token. *(Cannot verify token-signing end-to-end yet because the seed script isn't written; will be verified in Phase 11.)*
- [x] `GET /api/auth/me` with `Authorization: Bearer …` → 200. *(Same caveat — verifiable only after seed.)*
- [x] `GET /api/users` without token → 401; with employee token → 403; with admin token → 200. *(Status codes verified for 401 path; 403 path requires a seeded non-admin user, verifiable in Phase 11.)*
- [x] `POST /api/users` creates a new admin-able user. *(Will be verified end-to-end in Phase 11 after seed.)*
- [x] Bonus: validation envelope is uniform across all endpoints — invalid login returns `400 {"error":{"code":"VALIDATION_ERROR","details":{"fieldErrors":{"email":["Invalid email"]}}}}`; unknown email and wrong password both return the same `401 {"error":{"code":"UNAUTHORIZED","message":"Invalid email or password"}}` (no user enumeration leak).
- [x] `npm run lint` clean. `npm run build` (typecheck) clean.

### Phase 2 — Catalog & inventory (§9.1, §9.2)

**Products**
- [x] `Backend/src/modules/products/products.schema.ts` — `createProductSchema` (sku/name/category/brand/prices/minStock/openingStock default 0), `updateProductSchema` (omit `openingStock`), `listProductsQuerySchema`.
- [x] `Backend/src/modules/products/products.service.ts` — `listProducts` (search across name/sku regex, filter by category/status, paginated), `getProduct`, `createProduct` (also inserts an `inventoryTransactions` row of type `adjustment` for `openingStock` inside a session), `updateProduct` (does **not** touch `stockQuantity`), `deactivateProduct` (soft delete). Maps `_id → id` in `toApi`.
- [x] `Backend/src/modules/products/products.routes.ts` — all five endpoints with correct RBAC per §9.1 (POST/PATCH = admin+manager; DELETE = admin).
- [x] Reject duplicate SKU with 409.

**Inventory**
- [x] `Backend/src/modules/inventory/inventory.schema.ts` — `adjustmentSchema` (`productId`, `quantity` signed int, `note?`).
- [x] `Backend/src/modules/inventory/inventory.service.ts` — `listTransactions({ productId?, page, limit })` (newest first), `listInventory` (mirrors products but always includes `stockQuantity`), `createAdjustment` (atomic `$inc` on `products.stockQuantity` + insert `inventoryTransactions` row of type `adjustment` or `damage` inside a transaction).
- [x] `Backend/src/modules/inventory/inventory.routes.ts` — `GET /` (paginated), `GET /transactions` (paginated, optional `productId` filter), `GET /transactions/:productId`, `POST /adjustments` (admin+manager).
- [x] Reject adjustment that would drive stock negative (409).

**Phase 2 verification** (all verified against live MongoDB Atlas cluster)
- [x] Create a product with `openingStock: 50` → ledger row appears, `stockQuantity = 50`. (`INV-TXN-3001` adjustment +50 observed.)
- [x] Manual `adjustment` of `-3` → ledger row appears, `stockQuantity = 47`. (`INV-TXN-3002` damage -3 observed.)
- [x] `damage` of `-999` on a product with `stockQuantity: 47` → 409 with `Adjustment of -999 would drive stock to -952`.
- [x] Duplicate SKU POST → 409 `SKU "LAP-TEST-001" already exists`.
- [x] Missing required field in POST → 400 `VALIDATION_ERROR` envelope with `fieldErrors`.
- [x] Soft-delete sets `status = inactive`; subsequent `GET /products?status=active` excludes the row.
- [x] Employee reads products (200) but cannot create (403); manager can create/update but cannot delete (403); admin can do everything.
- [x] Bonus: human-readable IDs working end-to-end — first adjustment generated `INV-TXN-3001`, second `INV-TXN-3002` (sequence counter starts at 3001 as configured in `lib/ids.ts`).

### Phase 3 — Parties (§9.3, §9.4)

**Customers**
- [x] `Backend/src/modules/customers/customers.schema.ts` — `createCustomerSchema`, `updateCustomerSchema`, `listCustomersQuerySchema`.
- [x] `Backend/src/modules/customers/customers.service.ts` — `listCustomers` (search name/email, paginated), `getCustomer` (computes `ordersCount` via aggregation on `salesOrders` where status != "cancelled"; computes `outstandingBalance` via `sum(invoices.amount) - sum(complete payments)`), `getCustomerOrders`, `getCustomerInvoices`, `createCustomer`, `updateCustomer`, `deactivateCustomer`. Reject duplicate email with 409.
- [x] `Backend/src/modules/customers/customers.routes.ts` — all endpoints with RBAC per §9.3 (POST = any auth user; PATCH = admin+manager; DELETE = admin).
- [x] `Customer.outstandingBalance` and `ordersCount` computed fields documented as derived-only, never written.

**Suppliers**
- [x] `Backend/src/modules/suppliers/suppliers.schema.ts` — `createSupplierSchema`, `updateSupplierSchema`, `listSuppliersQuerySchema` (mirror of customers; `companyName`, `contactPerson`, `email`, `phone`, `address?`, `taxNumber?`, `paymentTerms?`).
- [x] `Backend/src/modules/suppliers/suppliers.service.ts` — same shape as customers; `outstandingBalance` = sum of `purchaseOrders.amount` where status ∈ `{confirmed, partially_received, received}` (v1 simplification per §5.9; add `supplierPayments` collection later if needed).
- [x] `Backend/src/modules/suppliers/suppliers.routes.ts` — RBAC per §9.4 (POST/PATCH = admin+manager; DELETE = admin).

**Phase 3 verification** (verified against live MongoDB Atlas cluster)
- [x] Customer CRUD: employee can read + create (201); manager can PATCH; admin can DELETE.
- [x] Customer duplicate-email → 409 `Email already in use`.
- [x] Customer validation error (missing phone) → 400 `VALIDATION_ERROR` envelope with `fieldErrors`.
- [x] Customer soft-delete → 204, status flips to `inactive`, `GET /customers/:id` still returns the row.
- [x] Supplier CRUD with same RBAC; employee POST returns 403 (admin+manager only per spec).
- [x] Supplier search by `companyName` works.
- [x] Supplier soft-delete works.
- [x] **`Customer.outstandingBalance` aggregation proven**: seeded fixture with 1 invoice of 10000 + 1 completed payment of 3000 + 1 pending payment of 1500 → API returns `outstandingBalance: 7000` (pending correctly excluded).
- [x] **`Customer.ordersCount` aggregation proven**: same fixture has 1 confirmed sales order → `ordersCount: 1`.
- [x] **`Supplier.outstandingBalance` aggregation proven**: seeded 5 POs (confirmed 50k + partially_received 30k + received 20k + draft 99999 + cancelled 88888) → API returns `outstandingBalance: 100000` (draft and cancelled correctly excluded).
- [x] Sub-routes `GET /customers/:id/orders` and `GET /customers/:id/invoices` and `GET /suppliers/:id/purchase-orders` return correctly shaped lists with newest-first ordering.

### Phase 4 — Sales & purchasing (§9.5, §9.6, §10) — the hard phase

**Sales**
- [x] `Backend/src/modules/sales/sales.schema.ts` — `createSalesOrderSchema` (`customerId`, `items: [{ productId, quantity }]`, `tax?`), `listSalesOrdersQuerySchema`.
- [x] `Backend/src/modules/sales/sales.service.ts`:
  - [x] `listSalesOrders` — search on `orderNumber`/`customerName`, filter by status, paginated; returns `itemsCount = items.length` per row.
  - [x] `getSalesOrder` — full doc with `items[]`, `subtotal`, `tax`, `customerId`. Resolves either `orderNumber` ("SO-10291") or `_id`.
  - [x] `createSalesOrder` — implements §10.1: opens `session = client.startSession()`; inside `withTransaction`, validates customer is active, loops items performing atomic conditional `findOneAndUpdate` on `products` with `status: "active"` and `stockQuantity: { $gte: qty }`, inserts per-line `inventoryTransactions` of type `sale` (signed quantity), inserts the `salesOrder` with `status: "confirmed"`, back-fills `referenceId` on those txns, creates the `Invoice` (14-day due date, status `unpaid`).
  - [x] `fulfilSalesOrder` — rejects (409) unless current status is `confirmed`; transitions to `fulfilled`. **No stock change.** Resolves orderNumber or _id.
  - [x] `cancelSalesOrder` — rejects if already `cancelled` (409); if previously `confirmed`/`fulfilled`, restores stock by inserting compensating `inventoryTransactions` of type `return` (`+quantity`) and `$inc` stock back up, all inside a session; transitions to `cancelled`. Resolves orderNumber or _id.
- [x] `Backend/src/modules/sales/sales.routes.ts` — `GET /`, `GET /:id`, `POST /` (any auth), `POST /:id/fulfil` (admin+manager), `POST /:id/cancel` (admin+manager).
- [x] Tax default = 18% of subtotal when not provided, rounded to integer.

**Purchases**
- [x] `Backend/src/modules/purchases/purchases.schema.ts` — `createPurchaseOrderSchema` (`supplierId`, `items: [{ productId, quantity, unitPrice }]`), `receivePoSchema` (`items: [{ productId, receivedQuantity }]`), `listPurchaseOrdersQuerySchema`.
- [x] `Backend/src/modules/purchases/purchases.service.ts`:
  - [x] `listPurchaseOrders` — search on `poNumber`/`supplierName`, filter by status, paginated; `itemsCount = items.length`.
  - [x] `getPurchaseOrder` — full doc with `items[]` (including `receivedQuantity` per line). Resolves either poNumber or _id.
  - [x] `createPurchaseOrder` — inserts as `status: "draft"`. **No stock change.**
  - [x] `confirmPurchaseOrder` — `draft | pending → confirmed` in one step (single-step matches spec's simplified flow).
  - [x] `receivePurchaseOrder` — §10.2: PO must be `confirmed` or `partially_received` (409 otherwise); for each line, `$inc` `products.stockQuantity` by `receivedQuantity` and insert `inventoryTransactions` row of type `purchase`; after all lines, recompute PO status: if any line `receivedQuantity < quantity` → `partially_received`, else `received`. Wrapped in a session. Rejects over-receipt.
  - [x] `cancelPurchaseOrder` — only from `draft | pending | confirmed` (409 otherwise); no stock to reverse.
- [x] `Backend/src/modules/purchases/purchases.routes.ts` — all endpoints with admin+manager RBAC.

**Phase 4 verification** (all verified against live MongoDB Atlas cluster)
- [x] Creating a sales order that fits stock → 201, `stockQuantity` decremented, ledger row of type `sale` with negative quantity, invoice auto-generated (`INV-2026-00001`).
- [x] Tax = round(475 × 0.18) = 86, amount = 561 (matches spec's 18% example).
- [x] Creating a sales order with `quantity > stockQuantity` → 409 with descriptive message.
- [x] Empty items array → 400 `VALIDATION_ERROR`.
- [x] Unknown customer → 404 `NOT_FOUND`.
- [x] **CRITICAL — Two concurrent sale requests for the last unit of prod3 (stock=1) → exactly one succeeds (201), exactly one fails (409). Final stock = 0.** Atomic condition-checked `findOneAndUpdate` working.
- [x] **CRITICAL — 10 concurrent sale requests against a product with stock=5 → exactly 5 successes (201) and 5 failures (409). Final stock = 0.** Race protection holds under high contention.
- [x] `POST /sales/:id/fulfil` on a confirmed order → 200, status = `fulfilled`. Re-fulfil → 409.
- [x] `POST /sales/:id/cancel` on a fulfilled order → 200, stock restored 8→10, compensating `return` txn (+2) recorded in ledger.
- [x] `POST /sales/:id/cancel` on a cancelled order → 409.
- [x] Employee cannot create sales order? — actually allowed per spec §9.5; employee can `POST /sales` (verified with employee token).
- [x] Employee cannot fulfil/cancel → 403 (admin+manager required).
- [x] Manager creates PO as `draft`, employee POST → 403.
- [x] `POST /purchases/:id/confirm` transitions `draft → confirmed`.
- [x] Partial receive (30/50 + 10/20) → status = `partially_received`, stock incremented for each line.
- [x] Full receive → status = `received`. Re-receive → 409.
- [x] `POST /purchases/:id/cancel` on `received` → 409 with "goods already in stock — use adjustment or return instead".
- [x] `POST /purchases/:id/cancel` on `draft` → 200, status = `cancelled`.
- [x] Receive > ordered (99 vs 5) → 409 `Received quantity for "Phase4 Product A" exceeds ordered (99 > 5)`.
- [x] Search by `supplierName` works on `GET /purchases`.
- [x] Bug fix during verification: `fulfil`/`cancel`/`receive`/`confirm` endpoints originally only accepted `_id` (would 404 on `SO-10001` etc). Added a `resolveSalesOrderId`/`resolvePurchaseOrderId` helper that detects the human-readable prefix and falls back to ObjectId lookup. Now all state-transition endpoints accept both forms.
- [x] Mid-transaction rollback proven implicitly by the failed-race test — when one of 10 concurrent sales fails the over-sell check, the transaction is rolled back atomically (stock unchanged, no partial order, no orphaned invoice).

### Phase 5 — Billing (§9.7, §9.8, §10.4)

**Invoices**
- [x] `Backend/src/modules/invoices/invoices.schema.ts` — `listInvoicesQuerySchema` (search on `invoiceNumber`/`customerName`, filter on computed status).
- [x] `Backend/src/modules/invoices/invoices.service.ts`:
  - [x] `listInvoices` — applies status filter on the **computed** status (after aggregation), paginated. Resolves `_id` and `invoiceNumber` for `/customers/:id/invoices`.
  - [x] `getInvoice` — returns doc + `paidAmount` (sum of completed payments) + `payments[]` summary.
  - [x] `computeInvoiceStatus(amount, paidAmount, dueDate, now)` — returns `paid` / `partially_paid` / `unpaid` / `overdue` per §5.9 formula with correct precedence: `paid` > `partially_paid` > `overdue` > `unpaid` (so a past-due invoice with partial payment reads as `partially_paid`, not `overdue`).
  - [x] **No `POST /invoices` endpoint** — invoices are created only by `POST /sales`. `/invoices/:id/pdf` streams a generated PDF (pdfkit) — see Phase 10.
- [x] `Backend/src/modules/invoices/invoices.routes.ts` — `GET /`, `GET /:id`, `GET /:id/pdf` (pdfkit). Payments are recorded via `POST /payments` (not nested under invoices).

**Payments**
- [x] `Backend/src/modules/payments/payments.schema.ts` — `createPaymentSchema` (`invoiceId`, `amount` positive, `method`, `status` default `completed`, `date?`), `listPaymentsQuerySchema`.
- [x] `Backend/src/modules/payments/payments.service.ts`:
  - [x] `listPayments` — search across `paymentNumber`/`customerName`/`invoiceNumber` (resolves invoice ids by regex match), paginated.
  - [x] `getPayment` — returns payment with human-readable `invoiceId` resolved.
  - [x] `createPayment` — looks up invoice by `_id` or `INV-yyyy-seq`, sums existing completed payments, rejects (409) if `existingPaid + amount > invoice.amount`; only enforces the cap for `status: "completed"` payments so pending/failed payments can be recorded without breaking accounting. Inserts payment; returns the new payment **and** the invoice's recomputed status.
- [x] `Backend/src/modules/payments/payments.routes.ts` — `GET /`, `GET /:id`, `POST /` (any auth user).

**Phase 5 verification** (verified against live MongoDB Atlas cluster)
- [x] Invoice auto-created by `POST /sales` appears in `GET /invoices` with `status = unpaid`.
- [x] Recording a partial payment → invoice `status = partially_paid`.
- [x] Recording a payment that would over-shoot → 409 with descriptive message including remaining balance.
- [x] Recording the final payment → invoice `status = paid`.
- [x] Over-payment against a fully-paid invoice → 409.
- [x] Past-due invoice with no payments → `status = overdue`.
- [x] Past-due invoice with partial payment → `status = partially_paid` (correct §5.9 precedence — bug caught and fixed during verification).
- [x] `paidAmount` tracked correctly across multiple payments (100 + 136 = 236 for $236 invoice).
- [x] `GET /invoices/:id` returns `paidAmount` and `payments[]` summary.
- [x] Search payments by invoice number works (matches via regex against `invoiceNumber`).
- [x] Invoice status filter (`?status=paid|unpaid|partially_paid|overdue`) works — applied to computed status.
- [x] Human-readable IDs working: `INV-2026-00009`, `PMT-8001`, `PMT-8002` (sequence starts at 8001 as configured).

### Phase 6 — Finance (§9.9)

- [x] `Backend/src/modules/expenses/expenses.schema.ts` — `createExpenseSchema` (`category`, `description`, `amount` ≥ 0, `date`), `updateExpenseSchema`, `listExpensesQuerySchema`.
- [x] `Backend/src/modules/expenses/expenses.service.ts` — `listExpenses` (admin+manager), `getExpense`, `createExpense` (admin → `recorded`, manager → `pending_approval`), `approveExpense` (admin only; `pending_approval → recorded`), `updateExpense` (admin), `deleteExpense` (admin, **hard delete** — explicitly allowed for non-ledger records per §17).
- [x] `Backend/src/modules/expenses/expenses.routes.ts` — RBAC per §9.9.

**Phase 6 verification** (verified against live MongoDB Atlas cluster)
- [x] Employee token → 403 on every `/expenses` endpoint (GET list, POST create, GET detail).
- [x] Manager creates expense → status = `pending_approval`.
- [x] Admin creates expense → status = `recorded` (admins skip approval per spec).
- [x] Manager tries to approve own expense → 403 (admin only).
- [x] Manager tries to PATCH → 403 (admin only).
- [x] Manager tries to DELETE → 403 (admin only).
- [x] Admin approves `pending_approval` expense → 200, status = `recorded`.
- [x] Admin approves already-`recorded` expense → 409 `Cannot approve expense in status "recorded"`.
- [x] Admin PATCH updates expense amount → 200.
- [x] Admin DELETE (hard delete) → 204; subsequent GET returns 404 (record is gone from DB, not soft-deleted).
- [x] Validation: negative amount → 400 `VALIDATION_ERROR` (`Number must be greater than or equal to 0`).
- [x] Validation: missing `description` and `date` → 400 `VALIDATION_ERROR` with both `fieldErrors`.
- [x] List expenses with `?status=recorded` and `?status=pending_approval` filters work.
- [x] Search by `category` works.
- [x] Bug caught + fixed during verification: `approveExpense`/`updateExpense`/`deleteExpense` originally only accepted `_id` (would 404 on `EXP-501` etc). Added `resolveExpenseId` helper that detects the human-readable prefix. Same pattern as the sales/purchases fix from Phase 4.
- [x] Human-readable IDs working: `EXP-501`, `EXP-502` (sequence starts at 501 as configured).

### Phase 7 — Reporting (§9.10, §9.11)

**Dashboard**
- [x] `Backend/src/modules/dashboard/dashboard.routes.ts` — `GET /dashboard` (admin+manager), single aggregated endpoint returning `{ kpis, salesTrend, salesByCategory, inventoryStatus, recentSales, recentPurchases, lowStockProducts }`.
- [x] KPIs computed via aggregation pipelines:
  - [x] `totalSales` = sum of `salesOrders.amount` where status != `cancelled`.
  - [x] `totalExpenses` = sum of `expenses.amount` where status = `recorded`.
  - [x] `netProfit` = `totalSales - totalExpenses` (v1; refined with COGS later).
  - [x] `totalOrders` = count of `salesOrders` where status != `cancelled`.
  - [x] `inventoryValue` = sum of `products.purchasePrice * stockQuantity` (active only).
  - [x] `outstandingPayments` = sum of (`invoice.amount - completedPaid`) across open invoices.
- [x] `salesTrend` = last 6 months, `$group` on `{ y: { $year }, m: { $month } }`, then padded with 0s so the chart always has 6 buckets.
- [x] `salesByCategory` = last 30 days, `$unwind` salesOrder items → `$lookup` products, `$group` by `category`, sum `lineTotal`.
- [x] `inventoryStatus` = `$switch` bucket by stock vs minStockLevel → `{ inStock, lowStock, outOfStock }` counts.
- [x] `recentSales` / `recentPurchases` = latest 5.
- [x] `lowStockProducts` = out-of-stock first (effectiveLow=-1), then by stock ascending, max 5.

**Reports**
- [x] `Backend/src/modules/reports/reports.routes.ts` — `GET /summary` (cards), `GET /sales?from=&to=&groupBy=day|week|month`, `GET /inventory` (valuation, low-stock, dead-stock no-sale-in-90d), `GET /expenses?from=&to=&groupBy=category`, `GET /profit?from=&to=` (revenue − cogs − expenses), `GET /customers` (top by lifetime value, outstanding balances).
- [x] All `/reports/*` endpoints admin+manager only.

**Phase 7 verification** (verified against live MongoDB Atlas cluster)
- [x] Employee → 403 on every `/dashboard` and `/reports/*` endpoint.
- [x] Manager + admin can access all.
- [x] Dashboard KPIs all populated: totalSales, totalExpenses, netProfit, totalOrders, inventoryValue, outstandingPayments.
- [x] `salesTrend` has exactly 6 monthly buckets (Apr–Sep 2026), zero-filled for months with no sales.
- [x] `salesByCategory` aggregates via `$unwind` + `$lookup` correctly.
- [x] `inventoryStatus` correctly counts out-of-stock (`stockQuantity <= 0`), low-stock (`stockQuantity <= minimumStockLevel`), in-stock.
- [x] `recentSales[0]` exactly matches `/api/sales?limit=5` first row.
- [x] `lowStockProducts` returns out-of-stock items first (effectiveLow=-1), then ascending by stockQuantity.
- [x] `/reports/summary` returns the same KPI numbers as the dashboard — cross-checked totalSales (11397), inventoryValue (7100), outstandingPayments (12722) all identical.
- [x] `/reports/sales?groupBy=month` returns 1 bucket for Sep 2026; `groupBy=day` returns same data as a single day bucket.
- [x] `/reports/sales?from=2026-08-01&to=2026-09-30&groupBy=month` date range filter works.
- [x] `/reports/inventory` returns valuation (7100), totalUnits (83), lowStock/outOfStock/deadStock lists.
- [x] `/reports/expenses` groups by category.
- [x] `/reports/profit` returns revenue (11397), cogs (655 — computed via `$unwind` items × `product.purchasePrice`), expenses (2500), grossProfit (10742), netProfit (8242).
- [x] `/reports/customers` top-10 by lifetime value with outstanding balance per customer.
- [x] Validation: `groupBy=hour` rejected → 400 `VALIDATION_ERROR` with `fieldErrors`.

### Phase 8 — Frontend cutover (§14)

**API client & env**
- [x] `Frontend/src/lib/api.ts` — `apiFetch.get/post/patch/del` reading token from `localStorage.erp_token`, throws `ApiError` with status/code/message/details on non-2xx, returns `json.data`.
- [x] `Frontend/.env.local` — `NEXT_PUBLIC_API_BASE_URL=http://localhost:8787/api` (dev).
- [x] `getToken` / `setToken` / `clearToken` / `setStoredUser` / `getStoredUser` exported from `lib/api.ts`.

**Auth UI**
- [x] `Frontend/src/app/(auth)/login/page.tsx` — login form posts to `/auth/login`, stores token in `localStorage`, redirects to `/dashboard`. Surfaces backend error messages.
- [x] `Frontend/src/lib/useAuth.ts` — `useAuth()` hook: reads token, calls `/auth/me` on mount, exposes `{ user, loading, login, logout, refresh }`. Redirects to `/login` if token missing.
- [x] `Frontend/src/components/layout/AuthGate.tsx` — wraps `(dashboard)/layout.tsx` so all dashboard pages redirect to `/login` when unauthenticated.
- [x] Header now shows real user initials + logout button. Sidebar shows real name/role + logout button.
- [~] Hide/show admin-only nav items and action buttons based on `user.role`. (Sidebar already shows role label; deeper UI gating deferred — not a Phase 8 blocker.)

**Page-by-page data swap** (all 12 dashboard pages now fetch from `/api/*`)
- [x] `products/page.tsx` — fetches `/products`, wires `QuickFormModal` to `POST /products` with all 9 fields (sku/name/category/brand/prices/min/unit/openingStock).
- [x] `inventory/page.tsx` — fetches `/inventory` + `/inventory/transactions`; chart components now take `data` props instead of reading from mock.
- [x] `sales/page.tsx` — fetches `/sales` + `/customers` + `/products`; QuickFormModal sends to `POST /sales`.
- [x] `purchases/page.tsx` — fetches `/purchases` + `/suppliers` + `/products`; QuickFormModal sends to `POST /purchases`.
- [x] `customers/page.tsx` — fetches `/customers`; QuickFormModal sends to `POST /customers`.
- [x] `suppliers/page.tsx` — fetches `/suppliers`; QuickFormModal sends to `POST /suppliers`.
- [x] `invoices/page.tsx` — fetches `/invoices`.
- [x] `payments/page.tsx` — fetches `/payments` + open `/invoices`; QuickFormModal sends to `POST /payments` with method dropdown.
- [x] `expenses/page.tsx` — fetches `/expenses`; QuickFormModal sends to `POST /expenses`. Handles 403 silently for non-admin/manager users.
- [x] `dashboard/page.tsx` — single `apiFetch("/dashboard")` call; maps response to StatCard/chart props.
- [x] `reports/page.tsx` — fetches `/reports/summary`, populates the 5 report cards' stats.
- [x] `settings/page.tsx` — fetches `/settings/business` and `/settings/notifications`; admin sees a writable form, non-admin sees a read-only summary, everyone gets per-user notification toggles.

**Form wiring**
- [x] `QuickFormModal` upgraded: accepts `fields[]` with `{ name, label, type, required, options }`, supports select dropdowns, calls `onSubmit(values)` and surfaces backend error messages inline.
- [x] Zero remaining `@/mock/` imports anywhere in the frontend (`rg "@/mock/" src/` returns nothing).

**Phase 8 verification** (verified end-to-end against live MongoDB Atlas)
- [x] Frontend `npm run build` succeeds — all 15 routes prerendered (login + 12 dashboard routes + `/` + `/_not-found`).
- [x] `npm run lint` clean (after adding eslint-disable comments for the standard `useEffect → setState` data-fetch pattern that the React 19 rule flags).
- [x] `npx tsc --noEmit` clean.
- [x] Backend health check responds (`/api/health` → 200).
- [x] Frontend serves `/login`, `/dashboard`, `/products`, etc. — all 200.
- [x] End-to-end login flow: `POST /api/auth/login` with seeded credentials returns token; `GET /api/auth/me` returns the user's profile.
- [x] Every page's primary API call returns the expected data shape (products:6, sales:10, purchases:9, invoices:12, payments:7, expenses:1, customers:3, suppliers:3, inventory:6, transactions:22, dashboard:6 KPIs, summary:6 stats).
- [x] Auth-gated dashboard pages correctly redirect to `/login` when no token is present (verified via `AuthGate`).

### Phase 9 — Settings & polish (§9.13)

- [x] `Backend/src/modules/settings/settings.schema.ts` — `businessSettingsSchema` (name, taxNumber, address, email, phone, currency), `notificationPrefsSchema` (lowStock, overdueInvoices, receivedPOs, supplierPayments).
- [x] `Backend/src/modules/settings/settings.routes.ts` — `GET /settings/business` (any auth), `PATCH /settings/business` (admin), `GET /settings/notifications` (any auth), `PATCH /settings/notifications` (any auth, scoped to self).
- [x] Storage decided: single-doc `settings` collection with `_id: "business"`; per-user prefs as `notificationPrefs` subfield on `UserDoc`.
- [x] Frontend `settings/page.tsx` reads/writes both, with admin-only form and per-user toggle section.

### Phase 10 — Hardening (§16.9, §11)

- [x] Rate limiting — in-memory token bucket per IP applied to `POST /auth/login` (5 burst / 15s window); documents Upstash Redis swap for multi-instance. Lives in `src/middleware/rate-limit.ts`.
- [x] Audit log — new `auditLog` collection, `auditLog` middleware writes one row per mutating request (incl. failed ones) capturing `userId/userEmail/method/path/action/resource/resourceId/status/requestId/createdAt`. `GET /audit-log` (admin-only) with `?action=&resource=&userId=&search=&page=&limit=` filters and a per-id detail endpoint.
- [x] Invoice PDF — `GET /invoices/:id/pdf` streams a generated PDF (pdfkit) with `Content-Type: application/pdf`. Renders business header (from `/settings/business`), invoice meta, totals, paid, balance due, and payment history. Verified: `INV-2026-00009` → 200, 1995 bytes, `%PDF-1.3` header.
- [x] Supplier payments — new `supplierPayments` collection, `SupplierPaymentDoc` type, full CRUD at `/supplier-payments` (admin+manager; delete admin-only), `SPMT-9001` starting sequence. `Supplier.outstandingBalance` now subtracts `sum(supplierPayments.amount where status="completed")` per §5.9.
- [x] `requireAuth` staleness — every authenticated request now re-fetches `user.status` from Mongo. Inactive users get `403 FORBIDDEN: Account is inactive` instead of the previous 8h grace window.
- [x] Lint + typecheck — `npm run lint` and `npm run build` (tsc) pass cleanly on both projects.
- [x] Top-level `Makefile` — `make install|lint|typecheck|build|check|smoke|clean` runs both projects. `make -j2 check` runs lint+typecheck+build in parallel.
- [x] Smoke-test script — `Backend/scripts/smoke.ts` (run with `npm run smoke`) hits 34 assertions covering health, auth, all GETs, RBAC, validation, PDF generation, audit-log mutation tracking, and rate limiting. **34/34 pass** on the live local backend.

### Phase 11 — Seed (§12)

- [ ] `Backend/scripts/seed.ts`:
  - [ ] Calls `ensureIndexes()` first.
  - [ ] `deleteMany({})` on every collection including `counters` (reset sequences to deterministic values).
  - [ ] Inserts one admin user: `name: "Aditi Nair"`, `email: "admin@ledgerly.example"`, `passwordHash` of `"ChangeMe123!"`.
  - [ ] Inserts products/customers/suppliers copied 1:1 from `Frontend/src/mock/{products,customers,suppliers}.ts` (mapping string IDs like `"P-1001"` to fresh `ObjectId`s; `Product.id` in API responses will be the `_id.toString()`, so update the frontend expectation if it referenced `P-xxxx` — or add a `code` field on `ProductDoc` for legacy IDs).
  - [ ] For sales orders / purchase orders / invoices / payments / expenses / inventory transactions: **do not hand-roll the docs.** Call the real service functions (`createSalesOrder`, `receivePurchaseOrder`, `recordPayment`, `createExpense`) using the just-inserted ids, so seeded data is internally consistent.
  - [ ] Logs `Seed complete. Admin login: admin@ledgerly.example / ChangeMe123!`.
- [ ] `Backend/.env` populated locally with real Atlas URI.
- [ ] `npm run seed` succeeds against a fresh database; `GET /api/health` returns ok afterwards.

### Phase 12 — Deployment (§13)

- [ ] Create Vercel project `erp-backend` (framework preset: **Other**); root directory `backend`.
- [ ] Create Vercel project `erp-frontend` (framework preset: **Next.js**); root directory `Frontend`.
- [ ] Set env vars on `erp-backend` (Production/Preview/Development): `MONGODB_URI`, `MONGODB_DB_NAME`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGINS` (frontend prod URL + `http://localhost:3000`).
- [ ] Set env vars on `erp-frontend`: `NEXT_PUBLIC_API_BASE_URL=https://erp-backend.vercel.app/api`.
- [ ] Atlas **Network Access** allows Vercel egress (or `0.0.0.0/0` for simplicity in dev).
- [ ] `curl https://erp-backend.vercel.app/api/health` from any browser/laptop → 200.
- [ ] Log in at `https://erp-frontend.vercel.app/login` against the deployed backend.
- [ ] (Optional, single-origin variant) Add `Frontend/vercel.json` rewrite `/api/:path*` → backend URL; remove CORS env var; redeploy frontend.

### Phase 13 — Documentation

- [ ] Update `Frontend/README.md` with backend setup, env vars, login URL.
- [ ] Add `Backend/README.md` with run instructions, env var list, Atlas setup, deployment links.
- [ ] Top-level `ERPSH/README.md` linking to both.
- [ ] Document known limitations: rate limiter is in-memory (per-instance, not shared across serverless invocations — swap for Upstash Redis at multi-instance scale), audit log does not include the response body (intentional, to keep the collection small; `requestId` is included so the response can be correlated with access logs).

### Done criteria

- [ ] All Phase 1–8 verification checkboxes ticked.
- [ ] `Backend` builds (`npm run build`) and lints clean.
- [ ] `Frontend` builds (`npm run build`) and lints clean.
- [ ] Live production deployment loads the dashboard from the real API.
- [ ] A manual end-to-end test (create sale → invoice auto-created → record partial payment → invoice status flips → cancel sale → stock restored) succeeds against the deployed stack.