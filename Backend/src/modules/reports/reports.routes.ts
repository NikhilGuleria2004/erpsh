import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { zodHook } from "../../middleware/error-handler.js";
import { collections } from "../../db/collections.js";
import {
  expensesReportQuerySchema,
  profitReportQuerySchema,
  salesReportQuerySchema,
} from "./reports.schema.js";

const app = new Hono();
app.use("*", requireAuth, requireRole("admin", "manager"));

app.get("/summary", async (c) => {
  const { salesOrders, expenses, products, invoices } = await collections();
  const [salesAgg, expenseAgg, invAgg, outstandingAgg, customerCount] =
    await Promise.all([
      salesOrders
        .aggregate<{ total: number }>([
          { $match: { status: { $ne: "cancelled" } } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ])
        .toArray(),
      expenses
        .aggregate<{ total: number }>([
          { $match: { status: "recorded" } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ])
        .toArray(),
      products
        .aggregate<{ value: number }>([
          { $match: { status: "active" } },
          {
            $group: {
              _id: null,
              value: {
                $sum: { $multiply: ["$purchasePrice", "$stockQuantity"] },
              },
            },
          },
        ])
        .toArray(),
      invoices
        .aggregate<{ outstanding: number }>([
          {
            $lookup: {
              from: "payments",
              localField: "_id",
              foreignField: "invoiceId",
              as: "ps",
            },
          },
          {
            $project: {
              amount: 1,
              paid: {
                $sum: {
                  $map: {
                    input: {
                      $filter: {
                        input: "$ps",
                        as: "p",
                        cond: { $eq: ["$$p.status", "completed"] },
                      },
                    },
                    as: "p",
                    in: "$$p.amount",
                  },
                },
              },
            },
          },
          {
            $project: { remaining: { $subtract: ["$amount", "$paid"] } },
          },
          { $match: { remaining: { $gt: 0 } } },
          { $group: { _id: null, outstanding: { $sum: "$remaining" } } },
        ])
        .toArray(),
      collections()
        .then(({ customers }) =>
          customers.countDocuments({ status: "active" }),
        ),
    ]);
  const totalSales = salesAgg[0]?.total ?? 0;
  const totalExpenses = expenseAgg[0]?.total ?? 0;
  const inventoryValue = invAgg[0]?.value ?? 0;
  const outstandingPayments = outstandingAgg[0]?.outstanding ?? 0;
  return c.json({
    data: {
      totalSales,
      totalExpenses,
      netProfit: totalSales - totalExpenses,
      inventoryValue,
      outstandingPayments,
      activeCustomers: customerCount,
    },
  });
});

app.get(
  "/sales",
  zValidator("query", salesReportQuerySchema, zodHook),
  async (c) => {
    const { from, to, groupBy } = c.req.valid("query");
    const { salesOrders } = await collections();
    const match: Record<string, unknown> = {
      status: { $ne: "cancelled" },
    };
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range.$gte = from;
      if (to) range.$lte = to;
      match.date = range;
    }
    // Bucket by ISO date truncated to the chosen groupBy.
    const fmt =
      groupBy === "day"
        ? { format: "%Y-%m-%d" }
        : groupBy === "week"
          ? { format: "%G-W%V" }
          : { format: "%Y-%m" };
    const result = await salesOrders
      .aggregate<{ _id: string; total: number; count: number }>([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { date: "$date", ...fmt } },
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray();
    return c.json({ data: result });
  },
);

app.get("/inventory", async (c) => {
  const { products, inventoryTransactions } = await collections();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);

  const [lowStockDocs, valuation, recentlySoldIds] = await Promise.all([
    products
      .find({
        status: "active",
        $expr: { $lte: ["$stockQuantity", "$minimumStockLevel"] },
      })
      .sort({ stockQuantity: 1 })
      .toArray(),
    products
      .aggregate<{ _id: string; value: number; items: number }>([
        { $match: { status: "active" } },
        {
          $group: {
            _id: null,
            value: {
              $sum: { $multiply: ["$purchasePrice", "$stockQuantity"] },
            },
            items: { $sum: "$stockQuantity" },
          },
        },
      ])
      .toArray(),
    // Products that have had at least one SALE in the last 90 days.
    inventoryTransactions
      .distinct("productId", {
        type: "sale",
        createdAt: { $gte: ninetyDaysAgo },
      }),
  ]);

  const activeProductIds = lowStockDocs.map((p) => p._id);
  const recentlySoldSet = new Set(
    recentlySoldIds.map((id) => id.toString()),
  );
  const deadStock = lowStockDocs.filter(
    (p) => !recentlySoldSet.has(p._id.toString()),
  );

  return c.json({
    data: {
      inventoryValue: valuation[0]?.value ?? 0,
      totalUnits: valuation[0]?.items ?? 0,
      lowStock: lowStockDocs
        .filter((p) => p.stockQuantity > 0)
        .map((p) => ({
          id: p._id.toString(),
          name: p.name,
          sku: p.sku,
          stockQuantity: p.stockQuantity,
          minimumStockLevel: p.minimumStockLevel,
        })),
      outOfStock: lowStockDocs
        .filter((p) => p.stockQuantity <= 0)
        .map((p) => ({
          id: p._id.toString(),
          name: p.name,
          sku: p.sku,
        })),
      deadStock: deadStock.map((p) => ({
        id: p._id.toString(),
        name: p.name,
        sku: p.sku,
        stockQuantity: p.stockQuantity,
      })),
    },
  });
  void activeProductIds;
});

app.get(
  "/expenses",
  zValidator("query", expensesReportQuerySchema, zodHook),
  async (c) => {
    const { from, to } = c.req.valid("query");
    const { expenses } = await collections();
    const match: Record<string, unknown> = {};
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range.$gte = from;
      if (to) range.$lte = to;
      match.date = range;
    }
    const result = await expenses
      .aggregate<{ _id: string; total: number; count: number }>([
        { $match: match },
        {
          $group: {
            _id: "$category",
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
      ])
      .toArray();
    return c.json({ data: result });
  },
);

app.get(
  "/profit",
  zValidator("query", profitReportQuerySchema, zodHook),
  async (c) => {
    const { from, to } = c.req.valid("query");
    const { salesOrders, expenses } = await collections();
    const dateMatch: Record<string, Date> = {};
    if (from) dateMatch.$gte = from;
    if (to) dateMatch.$lte = to;

    const salesMatch: Record<string, unknown> = {
      status: { $ne: "cancelled" },
    };
    const expMatch: Record<string, unknown> = { status: "recorded" };
    if (from || to) {
      salesMatch.date = dateMatch;
      expMatch.date = dateMatch;
    }

    // Revenue = sum of sales.amount.
    const [revenueAgg, expenseAgg, cogsAgg] = await Promise.all([
      salesOrders
        .aggregate<{ total: number }>([
          { $match: salesMatch },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ])
        .toArray(),
      expenses
        .aggregate<{ total: number }>([
          { $match: expMatch },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ])
        .toArray(),
      // COGS = sum(salesOrderItems.quantity * product.purchasePrice) at sale time.
      // We use the denormalized lineTotal/quantity * product.purchasePrice as a
      // rough proxy when available; more accurate would be a per-sale-time
      // lookup. For v1, just sum lineTotal where product is currently known.
      salesOrders
        .aggregate<{ total: number }>([
          { $match: salesMatch },
          { $unwind: "$items" },
          {
            $lookup: {
              from: "products",
              localField: "items.productId",
              foreignField: "_id",
              as: "product",
            },
          },
          { $unwind: "$product" },
          {
            $group: {
              _id: null,
              total: {
                $sum: {
                  $multiply: ["$items.quantity", "$product.purchasePrice"],
                },
              },
            },
          },
        ])
        .toArray(),
    ]);
    const revenue = revenueAgg[0]?.total ?? 0;
    const expensesTotal = expenseAgg[0]?.total ?? 0;
    const cogs = cogsAgg[0]?.total ?? 0;
    return c.json({
      data: {
        revenue,
        cogs,
        expenses: expensesTotal,
        grossProfit: revenue - cogs,
        netProfit: revenue - cogs - expensesTotal,
      },
    });
  },
);

app.get("/customers", async (c) => {
  const { customers, salesOrders, invoices, payments } = await collections();

  // Top customers by lifetime value = sum of all their non-cancelled sales.
  const [ltv, outstanding] = await Promise.all([
    salesOrders
      .aggregate<{ _id: import("mongodb").ObjectId; ltv: number; orders: number }>(
        [
          { $match: { status: { $ne: "cancelled" } } },
          {
            $group: {
              _id: "$customerId",
              ltv: { $sum: "$amount" },
              orders: { $sum: 1 },
            },
          },
          { $sort: { ltv: -1 } },
          { $limit: 10 },
        ],
      )
      .toArray(),
    invoices
      .aggregate<{
        _id: import("mongodb").ObjectId;
        outstanding: number;
      }>([
        {
          $lookup: {
            from: "payments",
            localField: "_id",
            foreignField: "invoiceId",
            as: "ps",
          },
        },
        {
          $project: {
            customerId: 1,
            amount: 1,
            paid: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: "$ps",
                      as: "p",
                      cond: { $eq: ["$$p.status", "completed"] },
                    },
                  },
                  as: "p",
                  in: "$$p.amount",
                },
              },
            },
          },
        },
        {
          $project: {
            customerId: 1,
            remaining: { $subtract: ["$amount", "$paid"] },
          },
        },
        { $match: { remaining: { $gt: 0 } } },
        {
          $group: {
            _id: "$customerId",
            outstanding: { $sum: "$remaining" },
          },
        },
      ])
      .toArray(),
  ]);

  const outstandingMap = new Map(
    outstanding.map((o) => [o._id.toString(), o.outstanding]),
  );

  const ids = ltv.map((l) => l._id);
  const customerDocs = ids.length
      ? await customers
          .find({ _id: { $in: ids } }, { projection: { name: 1, email: 1 } })
          .toArray()
      : [];
  const custMap = new Map(
    customerDocs.map((d) => [d._id.toString(), d]),
  );

  const top = ltv.map((l) => {
    const cid = l._id.toString();
    const c = custMap.get(cid);
    return {
      id: cid,
      name: c?.name ?? "(deleted)",
      email: c?.email ?? "",
      lifetimeValue: l.ltv,
      ordersCount: l.orders,
      outstandingBalance: outstandingMap.get(cid) ?? 0,
    };
  });

  void payments;
  return c.json({ data: top });
});

export default app;