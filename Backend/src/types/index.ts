import type { ObjectId } from "mongodb";

export type Status = "active" | "inactive";
export type InvoiceStatus = "unpaid" | "partially_paid" | "paid" | "overdue";

export interface NotificationPrefs {
  lowStock: boolean;
  overdueInvoices: boolean;
  receivedPOs: boolean;
  supplierPayments: boolean;
}

export interface UserDoc {
  _id: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: "admin" | "manager" | "employee";
  phone?: string;
  status: Status;
  notificationPrefs?: NotificationPrefs;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierPaymentDoc {
  _id: ObjectId;
  paymentNumber: string;
  supplierId: ObjectId;
  supplierName: string;
  purchaseOrderId?: ObjectId;
  amount: number;
  method: "cash" | "card" | "bank_transfer" | "upi" | "other";
  status: "completed" | "pending" | "failed";
  date: Date;
  note?: string;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessSettingsDoc {
  _id: "business";
  name: string;
  taxNumber?: string;
  address?: string;
  email?: string;
  phone?: string;
  currency: string;
  updatedAt: Date;
}

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "login"
  | "approve"
  | "fulfill"
  | "cancel"
  | "receive"
  | "record_payment"
  | "supplier_payment";

export interface AuditLogDoc {
  _id: ObjectId;
  userId: ObjectId | null;
  userEmail: string | null;
  method: string;
  path: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  status: number;
  body?: unknown;
  requestId: string;
  createdAt: Date;
}

export interface ProductDoc {
  _id: ObjectId;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerDoc {
  _id: ObjectId;
  name: string;
  email: string;
  phone: string;
  address?: string;
  taxNumber?: string;
  creditLimit?: number;
  status: Status;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierDoc {
  _id: ObjectId;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address?: string;
  taxNumber?: string;
  paymentTerms?: string;
  status: Status;
  createdAt: Date;
  updatedAt: Date;
}

export interface SalesOrderItem {
  productId: ObjectId;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface SalesOrderDoc {
  _id: ObjectId;
  orderNumber: string;
  customerId: ObjectId;
  customerName: string;
  items: SalesOrderItem[];
  subtotal: number;
  tax: number;
  amount: number;
  status: "draft" | "confirmed" | "fulfilled" | "cancelled";
  date: Date;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseOrderItem {
  productId: ObjectId;
  productName: string;
  quantity: number;
  receivedQuantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface PurchaseOrderDoc {
  _id: ObjectId;
  poNumber: string;
  supplierId: ObjectId;
  supplierName: string;
  items: PurchaseOrderItem[];
  amount: number;
  status:
    | "draft"
    | "pending"
    | "confirmed"
    | "partially_received"
    | "received"
    | "cancelled";
  date: Date;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceDoc {
  _id: ObjectId;
  invoiceNumber: string;
  salesOrderId: ObjectId;
  customerId: ObjectId;
  customerName: string;
  amount: number;
  issueDate: Date;
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentDoc {
  _id: ObjectId;
  paymentNumber: string;
  invoiceId: ObjectId;
  customerId: ObjectId;
  customerName: string;
  amount: number;
  method: "cash" | "card" | "bank_transfer" | "upi" | "other";
  status: "completed" | "pending" | "failed";
  date: Date;
  createdAt: Date;
}

export interface ExpenseDoc {
  _id: ObjectId;
  expenseNumber: string;
  category: string;
  description: string;
  amount: number;
  date: Date;
  status: "recorded" | "pending_approval";
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryTransactionDoc {
  _id: ObjectId;
  txnNumber: string;
  productId: ObjectId;
  productName: string;
  type: "purchase" | "sale" | "return" | "adjustment" | "damage";
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  referenceType: "sales_order" | "purchase_order" | "manual";
  referenceId: ObjectId | null;
  createdBy: ObjectId;
  createdAt: Date;
}

export interface CounterDoc {
  _id: string;
  seq: number;
  startedAt?: Date;
}