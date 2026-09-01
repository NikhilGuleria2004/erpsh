import "dotenv/config";
import { ObjectId } from "mongodb";
import { collections } from "../src/db/collections.js";
import { ensureIndexes } from "../src/db/ensureIndexes.js";
import { hashPassword } from "../src/lib/password.js";

async function main() {
  await ensureIndexes();
  const { users } = await collections();
  await users.deleteMany({});

  const now = new Date();
  const adminId = new ObjectId();
  const managerId = new ObjectId();
  const employeeId = new ObjectId();

  await users.insertMany([
    {
      _id: adminId,
      name: "Aditi Nair",
      email: "admin@ledgerly.example",
      passwordHash: await hashPassword("ChangeMe123!"),
      role: "admin",
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: managerId,
      name: "Manager One",
      email: "manager@ledgerly.example",
      passwordHash: await hashPassword("ChangeMe123!"),
      role: "manager",
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: employeeId,
      name: "Employee One",
      email: "employee@ledgerly.example",
      passwordHash: await hashPassword("ChangeMe123!"),
      role: "employee",
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
  ]);

  console.log("Seeded users:");
  console.log("  admin@ledgerly.example / ChangeMe123!");
  console.log("  manager@ledgerly.example / ChangeMe123!");
  console.log("  employee@ledgerly.example / ChangeMe123!");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});