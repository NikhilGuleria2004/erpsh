import { ObjectId, type ClientSession } from "mongodb";
import { collections } from "../../db/collections.js";
import { getClient } from "../../db/client.js";
import { Conflict, NotFound } from "../../lib/errors.js";
import { nextInventoryTxnId } from "../../lib/ids.js";
import { parsePagination, type PaginatedResult } from "../../lib/pagination.js";
import type {
  CreateProductInput,
  ListProductsQuery,
  UpdateProductInput,
} from "./products.schema.js";
import type { ProductDoc } from "../../types/index.js";

export interface ProductApi {
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
  status: "active" | "inactive";
}

function toApi(doc: ProductDoc): ProductApi {
  return {
    id: doc._id.toString(),
    sku: doc.sku,
    name: doc.name,
    category: doc.category,
    brand: doc.brand,
    purchasePrice: doc.purchasePrice,
    sellingPrice: doc.sellingPrice,
    stockQuantity: doc.stockQuantity,
    minimumStockLevel: doc.minimumStockLevel,
    unit: doc.unit,
    status: doc.status,
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toObjectId(id: string): ObjectId {
  try {
    return new ObjectId(id);
  } catch {
    throw NotFound("Product");
  }
}

export async function listProducts(
  query: ListProductsQuery,
): Promise<PaginatedResult<ProductApi>> {
  const { products } = await collections();
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.category) filter.category = query.category;
  if (query.search) {
    const re = new RegExp(escapeRegex(query.search), "i");
    filter.$or = [{ name: re }, { sku: re }];
  }
  const { page, limit, skip } = parsePagination(query);
  const [docs, total] = await Promise.all([
    products
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    products.countDocuments(filter),
  ]);
  return { items: docs.map(toApi), total, page, limit };
}

export async function getProduct(id: string): Promise<ProductApi> {
  const { products } = await collections();
  const doc = await products.findOne({ _id: toObjectId(id) });
  if (!doc) throw NotFound("Product");
  return toApi(doc);
}

export async function createProduct(
  input: CreateProductInput,
  userId: string,
): Promise<ProductApi> {
  const client = await getClient();
  const session = client.startSession();
  let created: ProductDoc | null = null;
  try {
    await session.withTransaction(async () => {
      const { products, users } = await collections();
      const oid = toObjectId(userId);
      const user = await users.findOne({ _id: oid }, { session });
      if (!user) throw NotFound("User");
      const creatorId = user._id;

      const now = new Date();
      const doc: ProductDoc = {
        _id: new ObjectId(),
        sku: input.sku,
        name: input.name,
        category: input.category,
        brand: input.brand,
        purchasePrice: input.purchasePrice,
        sellingPrice: input.sellingPrice,
        stockQuantity: input.openingStock,
        minimumStockLevel: input.minimumStockLevel,
        unit: input.unit,
        status: "active",
        createdAt: now,
        updatedAt: now,
      };
      try {
        await products.insertOne(doc, { session });
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "code" in err &&
          (err as { code: number }).code === 11000
        ) {
          throw Conflict(`SKU "${input.sku}" already exists`);
        }
        throw err;
      }

      if (input.openingStock > 0) {
        await collections().then(async (c) => {
          await c.inventoryTransactions.insertOne(
            {
              _id: new ObjectId(),
              txnNumber: await nextInventoryTxnId(),
              productId: doc._id,
              productName: doc.name,
              type: "adjustment",
              quantity: input.openingStock,
              previousQuantity: 0,
              newQuantity: input.openingStock,
              referenceType: "manual",
              referenceId: null,
              createdBy: creatorId,
              createdAt: now,
            },
            { session },
          );
        });
      }
      created = doc;
    });
  } finally {
    await session.endSession();
  }
  if (!created) throw new Error("Product creation failed");
  return toApi(created);
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
): Promise<ProductApi> {
  const { products } = await collections();
  const _id = toObjectId(id);
  const update: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined) update[k] = v;
  }
  const doc = await products.findOneAndUpdate(
    { _id },
    { $set: update },
    { returnDocument: "after" },
  );
  if (!doc) throw NotFound("Product");
  return toApi(doc);
}

export async function deactivateProduct(id: string): Promise<void> {
  const { products } = await collections();
  const result = await products.updateOne(
    { _id: toObjectId(id) },
    { $set: { status: "inactive", updatedAt: new Date() } },
  );
  if (result.matchedCount === 0) throw NotFound("Product");
}

export { toApi as toProductApi };
export type { ClientSession };