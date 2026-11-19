import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../src/config/db.js";
import Order from "../src/models/order.model.js";
import Product from "../src/models/product.model.js";
import Stock from "../src/models/stock.model.js";
import StockTransaction from "../src/models/stockTransaction.model.js";
import SupplyRequest from "../src/models/supplyRequest.model.js";
import User from "../src/models/user.model.js";
import Warehouse from "../src/models/warehouse.model.js";
import { assertQaDatabase } from "../src/utils/qaDatabaseGuard.js";
import { addStock, removeStock } from "../src/services/stock.service.js";

const seedPassword = process.env.SEED_PASSWORD || "Admin@123";
const reset = process.argv.includes("--reset");

const accountDefinitions = [
  { email: "admin@example.com", name: "Demo Admin", role: "admin" },
  { email: "manager1@example.com", name: "Demo Manager One", role: "warehouseManager" },
  { email: "manager2@example.com", name: "Demo Manager Two", role: "warehouseManager" },
  {
    email: "supplier1@example.com",
    name: "Demo Supplier One",
    role: "supplier",
    companyName: "Northstar Supplies",
  },
  {
    email: "supplier2@example.com",
    name: "Demo Supplier Two",
    role: "supplier",
    companyName: "Harbor Goods",
  },
  { email: "sales1@example.com", name: "Demo Sales One", role: "salesRepresentative" },
  { email: "sales2@example.com", name: "Demo Sales Two", role: "salesRepresentative" },
];

const productDefinitions = [
  { name: "Laptop", sku: "SEED-LAPTOP-001", category: "Electronics", price: 80000, lowStockLimit: 5, supplier: "supplier1@example.com" },
  { name: "Monitor", sku: "SEED-MONITOR-001", category: "Electronics", price: 25000, lowStockLimit: 5, supplier: "supplier2@example.com" },
  { name: "Smartphone", sku: "SEED-PHONE-001", category: "Electronics", price: 60000, lowStockLimit: 5, supplier: "supplier1@example.com" },
  { name: "Webcam", sku: "SEED-WEBCAM-001", category: "Electronics", price: 4500, lowStockLimit: 5, supplier: "supplier2@example.com" },
  { name: "Keyboard", sku: "SEED-KEYBOARD-001", category: "Accessories", price: 1500, lowStockLimit: 10, supplier: "supplier1@example.com" },
  { name: "Mouse", sku: "SEED-MOUSE-001", category: "Accessories", price: 800, lowStockLimit: 10, supplier: "supplier2@example.com" },
  { name: "Headset", sku: "SEED-HEADSET-001", category: "Accessories", price: 3000, lowStockLimit: 5, supplier: "supplier1@example.com" },
  { name: "Desk Chair", sku: "SEED-CHAIR-001", category: "Furniture", price: 12000, lowStockLimit: 2, supplier: "supplier2@example.com" },
  { name: "Desk", sku: "SEED-DESK-001", category: "Furniture", price: 18000, lowStockLimit: 2, supplier: "supplier1@example.com" },
];

const mainStockTargets = {
  "SEED-LAPTOP-001": 20,
  "SEED-MONITOR-001": 8,
  "SEED-PHONE-001": 9,
  "SEED-WEBCAM-001": 6,
  "SEED-KEYBOARD-001": 25,
  "SEED-MOUSE-001": 4,
  "SEED-HEADSET-001": 10,
  "SEED-CHAIR-001": 5,
  "SEED-DESK-001": 3,
};

const secondaryStockTargets = {
  "SEED-LAPTOP-001": 12,
  "SEED-MONITOR-001": 5,
  "SEED-PHONE-001": 6,
  "SEED-WEBCAM-001": 3,
  "SEED-KEYBOARD-001": 14,
  "SEED-MOUSE-001": 15,
  "SEED-HEADSET-001": 7,
  "SEED-CHAIR-001": 2,
  "SEED-DESK-001": 1,
};

const sampleOrders = [
  {
    orderNumber: "SEED-PENDING-001",
    customerName: "Pending Demo Customer",
    customerPhone: "03001234567",
    productSku: "SEED-MOUSE-001",
    quantity: 1,
    status: "Pending",
    salesEmail: "sales1@example.com",
  },
  {
    orderNumber: "SEED-PROCESSING-001",
    customerName: "Processing Demo Customer",
    customerPhone: "03001234568",
    productSku: "SEED-KEYBOARD-001",
    quantity: 2,
    status: "Processing",
    salesEmail: "sales1@example.com",
  },
  {
    orderNumber: "SEED-COMPLETED-001",
    customerName: "Completed Demo Customer",
    customerPhone: "03001234569",
    productSku: "SEED-LAPTOP-001",
    quantity: 1,
    status: "Completed",
    salesEmail: "sales2@example.com",
  },
  {
    orderNumber: "SEED-CANCELLED-001",
    customerName: "Cancelled Demo Customer",
    customerPhone: "03001234570",
    productSku: "SEED-MOUSE-001",
    quantity: 1,
    status: "Cancelled",
    salesEmail: "sales2@example.com",
  },
];

async function findOrCreateUser(definition) {
  let user = await User.findOne({ email: definition.email });
  if (!user) user = new User({ email: definition.email });
  user.name = definition.name;
  user.email = definition.email;
  user.role = definition.role;
  user.password = seedPassword;
  user.assignedWarehouses = [];
  user.companyName = definition.companyName || undefined;
  user.image = undefined;
  user.imageFileId = undefined;
  await user.save();
  return user;
}

async function findOrCreateWarehouse(name, location, manager) {
  let warehouse = await Warehouse.findOne({ name });
  if (!warehouse) warehouse = new Warehouse({ name });
  warehouse.location = location;
  warehouse.manager = manager._id;
  warehouse.capacity = 1000;
  await warehouse.save();
  return warehouse;
}

async function findOrCreateProduct(definition, usersByEmail, admin) {
  let product = await Product.findOne({ sku: definition.sku });
  if (!product) product = new Product({ sku: definition.sku });
  product.name = definition.name;
  product.description = `Seed ${definition.name} product`;
  product.category = definition.category;
  product.price = definition.price;
  product.lowStockLimit = definition.lowStockLimit;
  product.supplier = usersByEmail.get(definition.supplier)._id;
  product.createdBy = admin._id;
  product.imageUrl = null;
  product.imageFileId = null;
  await product.save();
  return product;
}

async function ensureStockRecord({ product, warehouse, quantity, performedBy }) {
  if (await Stock.exists({ product, warehouse })) return;
  await addStock({
    product,
    warehouse,
    quantity,
    performedBy,
    note: "Seed initial stock",
  });
}

async function createSampleOrder(definition, product, warehouse, creator, manager) {
  let order = await Order.findOne({ orderNumber: definition.orderNumber });
  if (!order) {
    order = await Order.create({
      orderNumber: definition.orderNumber,
      customerName: definition.customerName,
      customerPhone: definition.customerPhone,
      products: [{ product: product._id, quantity: definition.quantity, price: product.price }],
      totalAmount: product.price * definition.quantity,
      warehouse: warehouse._id,
      createdBy: creator._id,
      status: definition.status === "Cancelled" ? "Cancelled" : "Pending",
    });
  }
  if (definition.status !== "Processing" && definition.status !== "Completed") return;
  if (order.status !== "Pending") return;

  const note = `Order ${order.orderNumber}`;
  const existingTransaction = await StockTransaction.exists({
    product: product._id,
    warehouse: warehouse._id,
    note,
  });
  let deduction;
  if (!existingTransaction) {
    const stock = await Stock.findOne({ product: product._id, warehouse: warehouse._id })
      .select("quantity")
      .lean();
    const missingQuantity = definition.quantity - (stock?.quantity ?? 0);
    if (missingQuantity > 0) {
      await addStock({
        product: product._id,
        warehouse: warehouse._id,
        quantity: missingQuantity,
        performedBy: manager._id,
        note: `Seed stock for ${order.orderNumber}`,
      });
    }
    deduction = await removeStock({
      product: product._id,
      warehouse: warehouse._id,
      quantity: definition.quantity,
      performedBy: manager._id,
      note,
    });
  }
  try {
    const updated = await Order.findOneAndUpdate(
      { _id: order._id, status: "Pending" },
      { $set: { status: definition.status } },
      { new: true }
    );
    if (!updated && (await Order.findById(order._id))?.status !== definition.status) {
      throw new Error(`Could not set sample order ${order.orderNumber} to ${definition.status}`);
    }
  } catch (error) {
    if (deduction) {
      await Stock.findOneAndUpdate(
        { product: product._id, warehouse: warehouse._id },
        { $inc: { quantity: definition.quantity } },
        { new: true }
      );
      await StockTransaction.deleteOne({ _id: deduction.transaction._id });
    }
    throw error;
  }
}

async function ensureSupplyRequest({
  supplier,
  product,
  warehouse,
  admin,
  status,
  quantity,
  note,
}) {
  let request = await SupplyRequest.findOne({ supplier, product, warehouse, note });
  if (!request) {
    request = new SupplyRequest({ supplier, product, warehouse, quantity, note });
  }
  request.quantity = quantity;
  request.status = status;
  if (status === "Approved" || status === "Rejected") {
    request.reviewedBy = admin._id;
    request.reviewedAt ||= new Date();
  } else {
    request.reviewedBy = undefined;
    request.reviewedAt = undefined;
  }
  await request.save();
  return request;
}

async function seed() {
  if (!assertQaDatabase(process.env.MONGO_URI, "Seed")) {
    process.exitCode = 1;
    return;
  }
  if (process.env.NODE_ENV === "production" && !process.env.SEED_PASSWORD) {
    throw new Error("Set SEED_PASSWORD before running the seed script in production");
  }
  await connectDB();

  if (reset) {
    await Promise.all([
      Order.deleteMany({}),
      SupplyRequest.deleteMany({}),
      StockTransaction.deleteMany({}),
      Stock.deleteMany({}),
      Product.deleteMany({}),
      Warehouse.deleteMany({}),
      User.deleteMany({}),
    ]);
  }

  const accounts = await Promise.all(accountDefinitions.map(findOrCreateUser));
  const usersByEmail = new Map(accounts.map((user) => [user.email, user]));
  const admin = usersByEmail.get("admin@example.com");
  const manager1 = usersByEmail.get("manager1@example.com");
  const manager2 = usersByEmail.get("manager2@example.com");
  const supplier1 = usersByEmail.get("supplier1@example.com");
  const supplier2 = usersByEmail.get("supplier2@example.com");
  const sales1 = usersByEmail.get("sales1@example.com");
  const sales2 = usersByEmail.get("sales2@example.com");

  const [mainWarehouse, secondaryWarehouse] = await Promise.all([
    findOrCreateWarehouse("Main Warehouse", "Central District", manager1),
    findOrCreateWarehouse("Secondary Warehouse", "Harbor District", manager2),
  ]);
  await User.updateMany(
    { role: "warehouseManager" },
    { $pull: { assignedWarehouses: { $in: [mainWarehouse._id, secondaryWarehouse._id] } } }
  );
  manager1.assignedWarehouses = [mainWarehouse._id];
  manager2.assignedWarehouses = [secondaryWarehouse._id];
  await Promise.all([manager1.save(), manager2.save()]);

  const products = await Promise.all(
    productDefinitions.map((definition) => findOrCreateProduct(definition, usersByEmail, admin))
  );
  const productsBySku = new Map(products.map((product) => [product.sku, product]));
  const approvedNote = "Seed approved supply request";
  const approvedStockNote = "Seed approved supply stock";
  const approvedStockTransaction = await StockTransaction.exists({ note: approvedStockNote });
  const missingOrderDeductions = new Map();
  for (const definition of sampleOrders) {
    if (
      definition.status !== "Processing" &&
      definition.status !== "Completed"
    ) continue;
    if (await Order.exists({ orderNumber: definition.orderNumber })) continue;
    const key = definition.productSku;
    missingOrderDeductions.set(
      key,
      (missingOrderDeductions.get(key) || 0) + definition.quantity
    );
  }

  for (const [sku, quantity] of Object.entries(mainStockTargets)) {
    const approvedQuantity = sku === "SEED-KEYBOARD-001" && approvedStockTransaction ? 3 : 0;
    const orderQuantity = missingOrderDeductions.get(sku) || 0;
    await ensureStockRecord({
      product: productsBySku.get(sku)._id,
      warehouse: mainWarehouse._id,
      quantity: quantity + approvedQuantity + orderQuantity,
      performedBy: admin._id,
    });
    await ensureStockRecord({
      product: productsBySku.get(sku)._id,
      warehouse: secondaryWarehouse._id,
      quantity: secondaryStockTargets[sku],
      performedBy: admin._id,
    });
  }

  for (const definition of sampleOrders) {
    await createSampleOrder(
      definition,
      productsBySku.get(definition.productSku),
      mainWarehouse,
      usersByEmail.get(definition.salesEmail),
      manager1
    );
  }

  const approvedRequest = await ensureSupplyRequest({
    supplier: supplier1._id,
    product: productsBySku.get("SEED-KEYBOARD-001")._id,
    warehouse: mainWarehouse._id,
    admin,
    status: "Approved",
    quantity: 3,
    note: approvedNote,
  });
  if (!(await StockTransaction.exists({ note: approvedStockNote }))) {
    await addStock({
      product: approvedRequest.product,
      warehouse: approvedRequest.warehouse,
      quantity: approvedRequest.quantity,
      performedBy: admin._id,
      note: approvedStockNote,
    });
  }
  await Promise.all([
    ensureSupplyRequest({
      supplier: supplier2._id,
      product: productsBySku.get("SEED-MOUSE-001")._id,
      warehouse: mainWarehouse._id,
      admin,
      status: "Pending",
      quantity: 5,
      note: "Seed pending supply request",
    }),
    ensureSupplyRequest({
      supplier: supplier2._id,
      product: productsBySku.get("SEED-HEADSET-001")._id,
      warehouse: secondaryWarehouse._id,
      admin,
      status: "Rejected",
      quantity: 2,
      note: "Seed rejected supply request",
    }),
  ]);

  const credentialPassword = process.env.SEED_PASSWORD
    ? "SEED_PASSWORD configured (not printed)"
    : "Admin@123";
  console.log("Seed complete. All seeded accounts share this demo password:");
  console.table(accountDefinitions.map(({ email, role }) => ({
    email,
    role,
    password: credentialPassword,
  })));
  console.log("Warehouses: Main Warehouse (manager1), Secondary Warehouse (manager2)");
  console.log("Mouse stock in Main Warehouse: 4 (low-stock limit: 10)");
}

seed()
  .catch((error) => {
    const message = String(error.message || "").replace(
      /mongodb(?:\+srv)?:\/\/[^\s@]+@/gi,
      "mongodb://[redacted]@"
    );
    console.error("Seed failed:", error.name || "Error", message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
