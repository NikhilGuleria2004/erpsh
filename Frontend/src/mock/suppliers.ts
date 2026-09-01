import type { Supplier } from "@/types";

export const suppliers: Supplier[] = [
  { id: "S-001", companyName: "ABC Electronics", contactPerson: "Suresh Rao", email: "sales@abcelectronics.example", phone: "+91 90111 22334", outstandingBalance: 550000, status: "active" },
  { id: "S-002", companyName: "Prime Distributors", contactPerson: "Neha Kapoor", email: "orders@primedist.example", phone: "+91 90222 33445", outstandingBalance: 0, status: "active" },
  { id: "S-003", companyName: "TechWorld Wholesale", contactPerson: "Arjun Verma", email: "contact@techworld.example", phone: "+91 90333 44556", outstandingBalance: 128400, status: "active" },
  { id: "S-004", companyName: "Global Components Ltd", contactPerson: "Divya Menon", email: "info@globalcomponents.example", phone: "+91 90444 55667", outstandingBalance: 0, status: "active" },
  { id: "S-005", companyName: "Nova Peripherals", contactPerson: "Ramesh Iyer", email: "support@novaperipherals.example", phone: "+91 90555 66778", outstandingBalance: 32900, status: "inactive" },
];
