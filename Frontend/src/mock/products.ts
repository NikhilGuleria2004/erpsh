import type { Product } from "@/types";

export const products: Product[] = [
  { id: "P-1001", sku: "LAP-DELL-001", name: "Dell Inspiron 15", category: "Laptops", brand: "Dell", purchasePrice: 55000, sellingPrice: 65000, stockQuantity: 17, minimumStockLevel: 5, unit: "unit", status: "active" },
  { id: "P-1002", sku: "LAP-HP-014", name: "HP Pavilion 14", category: "Laptops", brand: "HP", purchasePrice: 48000, sellingPrice: 57500, stockQuantity: 2, minimumStockLevel: 5, unit: "unit", status: "active" },
  { id: "P-1003", sku: "LAP-DELL-002", name: "Dell Latitude 5420", category: "Laptops", brand: "Dell", purchasePrice: 62000, sellingPrice: 74000, stockQuantity: 9, minimumStockLevel: 4, unit: "unit", status: "active" },
  { id: "P-1004", sku: "MOB-APL-101", name: "iPhone 15", category: "Mobile Phones", brand: "Apple", purchasePrice: 68000, sellingPrice: 79900, stockQuantity: 24, minimumStockLevel: 8, unit: "unit", status: "active" },
  { id: "P-1005", sku: "MOB-SAM-045", name: "Samsung Galaxy S24", category: "Mobile Phones", brand: "Samsung", purchasePrice: 58000, sellingPrice: 69999, stockQuantity: 31, minimumStockLevel: 8, unit: "unit", status: "active" },
  { id: "P-1006", sku: "MON-DELL-027", name: "Dell 24\" Monitor", category: "Monitors", brand: "Dell", purchasePrice: 11500, sellingPrice: 14999, stockQuantity: 4, minimumStockLevel: 6, unit: "unit", status: "active" },
  { id: "P-1007", sku: "MON-LG-019", name: "LG UltraWide 29\"", category: "Monitors", brand: "LG", purchasePrice: 19500, sellingPrice: 24999, stockQuantity: 12, minimumStockLevel: 5, unit: "unit", status: "active" },
  { id: "P-1008", sku: "ACC-LOG-088", name: "Logitech Keyboard MK270", category: "Accessories", brand: "Logitech", purchasePrice: 1200, sellingPrice: 1999, stockQuantity: 4, minimumStockLevel: 10, unit: "unit", status: "active" },
  { id: "P-1009", sku: "ACC-LOG-091", name: "Logitech MX Master 3S", category: "Accessories", brand: "Logitech", purchasePrice: 6800, sellingPrice: 8999, stockQuantity: 18, minimumStockLevel: 6, unit: "unit", status: "active" },
  { id: "P-1010", sku: "ACC-APL-201", name: "Apple Magic Mouse", category: "Accessories", brand: "Apple", purchasePrice: 6200, sellingPrice: 7999, stockQuantity: 0, minimumStockLevel: 5, unit: "unit", status: "active" },
  { id: "P-1011", sku: "LAP-ASU-303", name: "Asus ROG Strix G15", category: "Laptops", brand: "Asus", purchasePrice: 89000, sellingPrice: 104999, stockQuantity: 6, minimumStockLevel: 3, unit: "unit", status: "active" },
  { id: "P-1012", sku: "NET-TPL-012", name: "TP-Link Archer AX55", category: "Networking", brand: "TP-Link", purchasePrice: 3400, sellingPrice: 4499, stockQuantity: 22, minimumStockLevel: 8, unit: "unit", status: "active" },
  { id: "P-1013", sku: "STO-SAN-500", name: "SanDisk 1TB SSD", category: "Storage", brand: "SanDisk", purchasePrice: 5600, sellingPrice: 7299, stockQuantity: 3, minimumStockLevel: 10, unit: "unit", status: "active" },
  { id: "P-1014", sku: "PRN-CAN-078", name: "Canon PIXMA G3010", category: "Printers", brand: "Canon", purchasePrice: 12800, sellingPrice: 15999, stockQuantity: 7, minimumStockLevel: 4, unit: "unit", status: "inactive" },
  { id: "P-1015", sku: "MOB-APL-102", name: "iPhone 15 Pro", category: "Mobile Phones", brand: "Apple", purchasePrice: 98000, sellingPrice: 114900, stockQuantity: 11, minimumStockLevel: 5, unit: "unit", status: "active" },
];
