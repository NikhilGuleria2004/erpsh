import "dotenv/config";

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:8787/api";
const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL ?? "admin@ledgerly.example";
const MGR_EMAIL = process.env.SMOKE_MGR_EMAIL ?? "manager@ledgerly.example";
const EMP_EMAIL = process.env.SMOKE_EMP_EMAIL ?? "employee@ledgerly.example";
const PASSWORD = process.env.SMOKE_PASSWORD ?? "ChangeMe123!";

interface Result {
  name: string;
  ok: boolean;
  detail?: string;
}

let token = "";
let mgrToken = "";
let empToken = "";

const results: Result[] = [];

async function call(
  path: string,
  init: RequestInit & { asManager?: boolean; asEmployee?: boolean } = {},
): Promise<{ status: number; body: unknown }> {
  const t = init.asEmployee ? empToken : init.asManager ? mgrToken : token;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
  });
  const text = await res.text();
  let body: unknown = text;
  try { body = text ? JSON.parse(text) : undefined; } catch { /* keep text */ }
  return { status: res.status, body };
}

function expect(name: string, cond: boolean, detail?: string) {
  results.push({ name, ok: cond, detail });
  console.log(`${cond ? "  PASS" : "  FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

async function login(email: string): Promise<string> {
  const { status, body } = await call("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (status !== 200) throw new Error(`login ${email} failed: ${status} ${JSON.stringify(body)}`);
  return (body as { data: { token: string } }).data.token;
}

async function run() {
  console.log(`Smoke test against ${BASE}`);

  // 1. Health
  {
    const { status, body } = await call("/health");
    expect("GET /health", status === 200, `status=${status} body=${JSON.stringify(body)}`);
  }

  // 2. Login
  try {
    token = await login(ADMIN_EMAIL);
    mgrToken = await login(MGR_EMAIL);
    empToken = await login(EMP_EMAIL);
    expect("POST /auth/login admin", !!token);
    expect("POST /auth/login manager", !!mgrToken);
    expect("POST /auth/login employee", !!empToken);
  } catch (err) {
    console.error("Login failed:", err);
    process.exit(1);
  }

  // 3. Auth
  {
    const { status, body } = await call("/auth/me");
    expect("GET /auth/me (authed)", status === 200);
    expect("  /me has email", !!(body as { data?: { email?: string } }).data?.email);
  }
  {
    const { status } = await call("/auth/me", { headers: { Authorization: "" } });
    // We can't easily strip the header here, but we can use a fake token:
    const { status: s2 } = await fetch(`${BASE}/auth/me`, { headers: { Authorization: "Bearer bad" } }).then(async (r) => ({ status: r.status }));
    expect("GET /auth/me (no/bad token) → 401", s2 === 401);
    void status;
  }

  // 4. Read endpoints
  for (const path of ["/products", "/customers", "/suppliers", "/sales", "/purchases", "/invoices", "/payments", "/expenses", "/inventory/transactions", "/users", "/settings/business", "/settings/notifications", "/supplier-payments", "/audit-log", "/dashboard", "/reports/summary"]) {
    const { status } = await call(path);
    expect(`GET ${path}`, status === 200, `status=${status}`);
  }

  // 5. Employee RBAC
  {
    const { status } = await call("/users", { asEmployee: true });
    expect("GET /users (employee → 403)", status === 403, `status=${status}`);
  }
  {
    const { status } = await call("/audit-log", { asEmployee: true });
    expect("GET /audit-log (employee → 403)", status === 403);
  }
  {
    const { status } = await call("/settings/business", {
      method: "PATCH",
      asEmployee: true,
      body: JSON.stringify({ name: "Nope" }),
    });
    expect("PATCH /settings/business (employee → 403)", status === 403);
  }
  {
    const { status } = await call("/supplier-payments", {
      method: "POST",
      asEmployee: true,
      body: JSON.stringify({ supplierId: "x", amount: 1, method: "cash" }),
    });
    expect("POST /supplier-payments (employee → 403)", status === 403);
  }

  // 6. Manager RBAC
  {
    const { status } = await call("/settings/business", {
      method: "PATCH",
      asManager: true,
      body: JSON.stringify({ name: "Manager attempt" }),
    });
    expect("PATCH /settings/business (manager → 403)", status === 403);
  }
  {
    const { status } = await call("/users", { asManager: true });
    expect("GET /users (manager → 403, admin-only)", status === 403, `status=${status}`);
  }

  // 7. Validation
  {
    const { status } = await call("/products", {
      method: "POST",
      body: JSON.stringify({ name: "" }),
    });
    expect("POST /products (empty name → 400)", status === 400);
  }
  {
    const { status } = await call("/customers", {
      method: "POST",
      body: JSON.stringify({ email: "not-an-email", name: "x", phone: "1" }),
    });
    expect("POST /customers (bad email → 400)", status === 400);
  }

  // 8. Invoice PDF
  {
    const list = await call("/invoices?limit=1");
    const id = (list.body as { data?: Array<{ id: string }> }).data?.[0]?.id;
    if (!id) {
      expect("GET /invoices/:id/pdf (skipped: no invoice)", true, "no invoice seeded");
    } else {
      const t = token;
      const r = await fetch(`${BASE}/invoices/${id}/pdf`, { headers: { Authorization: `Bearer ${t}` } });
      const ct = r.headers.get("content-type") ?? "";
      const buf = await r.arrayBuffer();
      const head = new Uint8Array(buf.slice(0, 4));
      const isPdf = head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46;
      expect(`GET /invoices/:id/pdf (${id})`, r.status === 200 && ct.includes("application/pdf") && isPdf, `status=${r.status} ct=${ct} bytes=${buf.byteLength} pdf=${isPdf}`);
    }
  }

  // 9. Idempotent audit log: trigger 3 mutations then read the latest entries
  {
    const before = await call("/audit-log?limit=1");
    const totalBefore = (before.body as { meta?: { total: number } }).meta?.total ?? 0;
    await call("/settings/business", { method: "PATCH", body: JSON.stringify({ name: "Smoke test" }) });
    await call("/settings/notifications", { method: "PATCH", body: JSON.stringify({ lowStock: true }) });
    const after = await call("/audit-log?limit=10");
    const totalAfter = (after.body as { meta?: { total: number } }).meta?.total ?? 0;
    expect("audit log gained entries after 2 mutations", totalAfter >= totalBefore + 2, `before=${totalBefore} after=${totalAfter}`);
  }

  // 10. Rate limit
  {
    // Burst 8 logins as the same user with wrong password
    const codes: number[] = [];
    for (let i = 0; i < 8; i++) {
      const r = await fetch(`${BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "nope@x.com", password: "bad" }),
      });
      codes.push(r.status);
    }
    const saw429 = codes.includes(429);
    expect("rate limit kicks in within 8 login attempts", saw429, `codes=${codes.join(",")}`);
  }

  // Summary
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length > 0) {
    console.log("\nFailures:");
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail ?? ""}`);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Smoke test crashed:", err);
  process.exit(1);
});
