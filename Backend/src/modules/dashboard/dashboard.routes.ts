import { Hono } from "hono";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { collections } from "../../db/collections.js";
import type {
  ProductDoc,
  PurchaseOrderDoc,
  SalesOrderDoc,
} from "../../types/index.js";

const app = new Hono();
app.use("*", requireAuth, requireRole("admin", "manager"));

interface SalesPoint {
  label: string;
  value: number;
}

interface CategorySlice {
  label: string;
  value: number;
}

interface RecentSalesRow {
  id: string;
  customerName: string;
  amount: number;
  date: string;
  status: SalesOrderDoc["status"];
  itemsCount: number;
}

interface RecentPurchaseRow {
  id: string;
  supplierName: string;
  itemsCount: number;
  amount: number;
  date: string;
  status: PurchaseOrderDoc["status"];
}

interface LowStockProduct {
  id: string;
  name: string;
  sku: string;
  stockQuantity: number;
  minimumStockLevel: number;
}

interface DashboardData {
  kpis: {
    totalSales: number;
    totalExpenses: number;
    netProfit: number;
    totalOrders: number;
    inventoryValue: number;
    outstandingPayments: number;
  };
  salesTrend: SalesPoint[];
  salesByCategory: CategorySlice[];
  inventoryStatus: { inStock: number; lowStock: number; outOfStock: number };
  recentSales: RecentSalesRow[];
  recentPurchases: RecentPurchaseRow[];
  lowStockProducts: LowStockProduct[];
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

app.get("/", async (c) => {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

  const {
    salesOrders,
    purchaseOrders,
    products,
    expenses,
    invoices,
  } = await collections();

  const [
    salesAgg,
    expenseAgg,
    invValueAgg,
    outstandingAgg,
  ] = await Promise.all([
    salesOrders
      .aggregate<{ total: number; count: number }>([
        { $match: { status: { $ne: "cancelled" } } },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
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
    // outstandingPayments = sum(invoice.amount - completedPayments) for non-paid invoices.
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
  ]);

  const totalSales = salesAgg[0]?.total ?? 0;
  const totalOrders = salesAgg[0]?.count ?? 0;
  const totalExpenses = expenseAgg[0]?.total ?? 0;
  const inventoryValue = invValueAgg[0]?.value ?? 0;
  const outstandingPayments = outstandingAgg[0]?.outstanding ?? 0;
  const netProfit = totalSales - totalExpenses;

  // salesTrend — last 6 months (including current).
  const trendAgg = await salesOrders
    .aggregate<{ _id: { y: number; m: number }; total: number }>([
      {
        $match: {
          status: { $ne: "cancelled" },
          date: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            y: { $year: "$date" },
            m: { $month: "$date" },
          },
          total: { $sum: "$amount" },
        },
      },
    ])
    .toArray();
  const trendMap = new Map(
    trendAgg.map((t) => [`${t._id.y}-${t._id.m}`, t.total]),
  );
  const salesTrend: SalesPoint[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(
      sixMonthsAgo.getFullYear(),
      sixMonthsAgo.getMonth() + i,
      1,
    );
    const total = trendMap.get(`${d.getFullYear()}-${d.getMonth() + 1}`) ?? 0;
    salesTrend.push({
      label: MONTH_LABELS[d.getMonth()] ?? "",
      value: total,
    });
  }

  // salesByCategory — last 30 days, summed lineTotal per product.category.
  const categoryAgg = await salesOrders
    .aggregate<{ _id: string; total: number }>([
      {
        $match: {
          status: { $ne: "cancelled" },
          date: { $gte: thirtyDaysAgo },
        },
      },
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
          _id: "$product.category",
          total: { $sum: "$items.lineTotal" },
        },
      },
      { $sort: { total: -1 } },
    ])
    .toArray();
  const salesByCategory: CategorySlice[] = categoryAgg.map((c) => ({
    label: c._id,
    value: c.total,
  }));

  // Inventory status — counts active products by stock vs minimum.
  const stockDetail = await products
    .aggregate<{ _id: string; count: number }>([
      { $match: { status: "active" } },
      {
        $project: {
          bucket: {
            $switch: {
              branches: [
                {
                  case: { $lte: ["$stockQuantity", 0] },
                  then: "outOfStock",
                },
                {
                  case: {
                    $lte: ["$stockQuantity", "$minimumStockLevel"],
                  },
                  then: "lowStock",
                },
              ],
              default: "inStock",
            },
          },
        },
      },
      { $group: { _id: "$bucket", count: { $sum: 1 } } },
    ])
    .toArray();
  const inventoryStatus = { inStock: 0, lowStock: 0, outOfStock: 0 };
  for (const b of stockDetail) {
    if (b._id === "inStock") inventoryStatus.inStock = b.count;
    else if (b._id === "lowStock") inventoryStatus.lowStock = b.count;
    else if (b._id === "outOfStock") inventoryStatus.outOfStock = b.count;
  }

  // recentSales (5), recentPurchases (5), lowStockProducts (5).
  const [recentSalesDocs, recentPurchaseDocs, lowStockDocs] = await Promise.all([
    salesOrders
      .find({})
      .sort({ date: -1, createdAt: -1 })
      .limit(5)
      .toArray(),
    purchaseOrders
      .find({})
      .sort({ date: -1, createdAt: -1 })
      .limit(5)
      .toArray(),
    products
      .aggregate<ProductDoc & { _id: ProductDoc["_id"] }>([
        { $match: { status: "active" } },
        {
          $addFields: {
            effectiveLow: {
              $cond: [
                { $lte: ["$stockQuantity", 0] },
                -1,
                "$stockQuantity",
              ],
            },
          },
        },
        { $sort: { effectiveLow: 1, stockQuantity: 1 } },
        { $limit: 5 },
      ])
      .toArray(),
  ]);

  const recentSales: RecentSalesRow[] = recentSalesDocs.map((d) => ({
    id: d.orderNumber,
    customerName: d.customerName,
    amount: d.amount,
    date: d.date.toISOString(),
    status: d.status,
    itemsCount: d.items.length,
  }));

  const recentPurchases: RecentPurchaseRow[] = recentPurchaseDocs.map((d) => ({
    id: d.poNumber,
    supplierName: d.supplierName,
    itemsCount: d.items.length,
    amount: d.amount,
    date: d.date.toISOString(),
    status: d.status,
  }));

  const lowStockProducts: LowStockProduct[] = lowStockDocs.map((d) => ({
    id: d._id.toString(),
    name: d.name,
    sku: d.sku,
    stockQuantity: d.stockQuantity,
    minimumStockLevel: d.minimumStockLevel,
  }));

  const data: DashboardData = {
    kpis: {
      totalSales,
      totalExpenses,
      netProfit,
      totalOrders,
      inventoryValue,
      outstandingPayments,
    },
    salesTrend,
    salesByCategory,
    inventoryStatus,
    recentSales,
    recentPurchases,
    lowStockProducts,
  };
  return c.json({ data });
});

export default app;