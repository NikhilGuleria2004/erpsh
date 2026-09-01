import { ObjectId } from "mongodb";
import { collections } from "../../db/collections.js";
import { getClient } from "../../db/client.js";
import { Conflict, NotFound, Unauthorized } from "../../lib/errors.js";
import { nextInventoryTxnId } from "../../lib/ids.js";
import { parsePagination, type PaginatedResult } from "../../lib/pagination.js";
import type {
  AdjustmentInput,
  ListInventoryQuery,
  ListTransactionsQuery,
} from "./inventory.schema.js";
import type {
  InventoryTransactionDoc,
  ProductDoc,
} from "../../types/index.js";
import { toProductApi, type ProductApi } from "../products/products.service.js";

export interface InventoryMovementApi {
  id: string;
  productName: string;
  type: InventoryTransactionDoc["type"];
  quantity: number;
  balanceAfter: number;
  date: string;
}

function toMovementApi(
  doc: InventoryTransactionDoc,
): InventoryMovementApi {
  return {
    id: doc.txnNumber,
    productName: doc.productName,
    type: doc.type,
    quantity: doc.quantity,
    balanceAfter: doc.newQuantity,
    date: doc.createdAt.toISOString(),
  };
}

function toObjectId(id: string): ObjectId {
  try {
    return new ObjectId(id);
  } catch {
    throw NotFound("Product");
  }
}

export async function listInventory(
  query: ListInventoryQuery,
): Promise<PaginatedResult<ProductApi>> {
  const { products } = await collections();
  const { page, limit, skip } = parsePagination(query);
  const [docs, total] = await Promise.all([
    products
      .find({})
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    products.countDocuments({}),
  ]);
  return { items: docs.map(toProductApi), total, page, limit };
}

export async function listTransactions(
  query: ListTransactionsQuery,
): Promise<PaginatedResult<InventoryMovementApi>> {
  const { inventoryTransactions } = await collections();
  const filter: Record<string, unknown> = {};
  if (query.productId) {
    try {
      filter.productId = new ObjectId(query.productId);
    } catch {
      throw NotFound("Product");
    }
  }
  const { page, limit, skip } = parsePagination(query);
  const [docs, total] = await Promise.all([
    inventoryTransactions
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    inventoryTransactions.countDocuments(filter),
  ]);
  return {
    items: docs.map(toMovementApi),
    total,
    page,
    limit,
  };
}

export async function getProductLedger(
  productId: string,
): Promise<InventoryMovementApi[]> {
  const { inventoryTransactions } = await collections();
  const oid = toObjectId(productId);
  const docs = await inventoryTransactions
    .find({ productId: oid })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map(toMovementApi);
}

export async function createAdjustment(
  input: AdjustmentInput,
  userId: string,
): Promise<InventoryMovementApi> {
  if (input.quantity === 0) {
    throw Conflict("Adjustment quantity cannot be zero");
  }
  const client = await getClient();
  const session = client.startSession();
  let result: InventoryTransactionDoc | null = null;
  try {
    await session.withTransaction(async () => {
      const { products, inventoryTransactions, users } = await collections();
      let creatorId: ObjectId;
      try {
        creatorId = new ObjectId(userId);
      } catch {
        throw Unauthorized();
      }
      const user = await users.findOne({ _id: creatorId }, { session });
      if (!user) throw Unauthorized();

      const productOid = await cToObjectId(input.productId);
      const previousQty = await getStockQty(
        products,
        productOid,
        session,
      );
      const newQty = previousQty + input.quantity;
      if (newQty < 0) {
        throw Conflict(
          `Adjustment of ${input.quantity} would drive stock to ${newQty}`,
        );
      }
      const updated = await products.findOneAndUpdate(
        { _id: productOid, stockQuantity: previousQty },
        { $inc: { stockQuantity: input.quantity }, $set: { updatedAt: new Date() } },
        { session, returnDocument: "after" },
      );
      if (!updated) {
        throw Conflict("Stock changed concurrently; retry");
      }

      const productName = updated.name;
      const txnNumber = await nextInventoryTxnId();
      const txn: InventoryTransactionDoc = {
        _id: new ObjectId(),
        txnNumber,
        productId: productOid,
        productName,
        type: input.type,
        quantity: input.quantity,
        previousQuantity: previousQty,
        newQuantity: newQty,
        referenceType: "manual",
        referenceId: null,
        createdBy: creatorId,
        createdAt: new Date(),
      };
      await inventoryTransactions.insertOne(txn, { session });
      result = txn;
    });
  } finally {
    await session.endSession();
  }
  if (!result) throw new Error("Adjustment failed");
  return toMovementApi(result);
}

async function cToObjectId(id: string): Promise<ObjectId> {
  try {
    return new ObjectId(id);
  } catch {
    throw NotFound("Product");
  }
}

async function getStockQty(
  products: import("mongodb").Collection<ProductDoc>,
  id: ObjectId,
  session: import("mongodb").ClientSession,
): Promise<number> {
  const doc = await products.findOne({ _id: id }, { session });
  if (!doc) throw NotFound("Product");
  return doc.stockQuantity;
}