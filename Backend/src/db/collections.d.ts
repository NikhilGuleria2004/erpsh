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
  BusinessSettingsDoc,
  SupplierPaymentDoc,
  AuditLogDoc,
} from "../types/index.js";

export interface Collections {
  users: import("mongodb").Collection<UserDoc>;
  products: import("mongodb").Collection<ProductDoc>;
  customers: import("mongodb").Collection<CustomerDoc>;
  suppliers: import("mongodb").Collection<SupplierDoc>;
  salesOrders: import("mongodb").Collection<SalesOrderDoc>;
  purchaseOrders: import("mongodb").Collection<PurchaseOrderDoc>;
  invoices: import("mongodb").Collection<InvoiceDoc>;
  payments: import("mongodb").Collection<PaymentDoc>;
  expenses: import("mongodb").Collection<ExpenseDoc>;
  inventoryTransactions: import("mongodb").Collection<InventoryTransactionDoc>;
  counters: import("mongodb").Collection<CounterDoc>;
  settings: import("mongodb").Collection<BusinessSettingsDoc>;
  supplierPayments: import("mongodb").Collection<SupplierPaymentDoc>;
  auditLog: import("mongodb").Collection<AuditLogDoc>;
}