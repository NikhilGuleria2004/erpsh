// Shared domain types for the ERP shell.
// These model the shape of data the real API will eventually return.
// All values in /mock are hand-written to satisfy these types.

export type Status = "active" | "inactive";

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  purchasePrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minimumStockLevel: number;
  unit: string;
  status: Status;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  ordersCount: number;
  outstandingBalance: number;
  status: Status;
}

export interface Supplier {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  outstandingBalance: number;
  status: Status;
}

export type SalesOrderStatus = "draft" | "confirmed" | "fulfilled" | "cancelled";

export interface SalesOrder {
  id: string;
  customerName: string;
  amount: number;
  date: string;
  status: SalesOrderStatus;
  itemsCount: number;
}

export type PurchaseOrderStatus =
  | "draft"
  | "pending"
  | "confirmed"
  | "partially_received"
  | "received"
  | "cancelled";

export interface PurchaseOrder {
  id: string;
  supplierName: string;
  itemsCount: number;
  amount: number;
  date: string;
  status: PurchaseOrderStatus;
}

export type InvoiceStatus = "unpaid" | "partially_paid" | "paid" | "overdue";

export interface Invoice {
  id: string;
  customerName: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
}

export type PaymentMethod = "cash" | "card" | "bank_transfer" | "upi" | "other";
export type PaymentStatus = "completed" | "pending" | "failed";

export interface Payment {
  id: string;
  invoiceId: string;
  customerName: string;
  amount: number;
  method: PaymentMethod;
  date: string;
  status: PaymentStatus;
}

export type ExpenseStatus = "recorded" | "pending_approval";

export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  status: ExpenseStatus;
}

export type InventoryMovementType =
  | "purchase"
  | "sale"
  | "return"
  | "adjustment"
  | "damage";

export interface InventoryMovement {
  id: string;
  productName: string;
  type: InventoryMovementType;
  quantity: number;
  balanceAfter: number;
  date: string;
}
