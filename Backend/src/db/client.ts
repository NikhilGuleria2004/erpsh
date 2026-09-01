import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME ?? "erp";

if (!uri) {
  throw new Error("MONGODB_URI is not set");
}
const mongoUri: string = uri;

// Cache the client on the Node global object so hot serverless
// invocations reuse the same connection pool instead of opening a new one
// on every request.
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function createClient(): Promise<MongoClient> {
  const client = new MongoClient(mongoUri, {
    maxPoolSize: 10,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 8000,
  });
  return client.connect();
}

const clientPromise: Promise<MongoClient> =
  globalThis._mongoClientPromise ??
  (globalThis._mongoClientPromise = createClient());

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(dbName);
}

export async function getClient(): Promise<MongoClient> {
  return clientPromise;
}