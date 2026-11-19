import "dotenv/config";
import { assertQaDatabase } from "../src/utils/qaDatabaseGuard.js";

const apiBase = (process.env.API_BASE_URL || "http://localhost:5001/api").replace(/\/+$/, "");
const seedPassword = process.env.SEED_PASSWORD || "Admin@123";
const createdPassword = "ApiTest@123";
const results = [];

async function request(path, { method = "GET", token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  return { status: response.status, data };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function check(name, action) {
  try {
    const detail = await action();
    results.push({ name, passed: true });
    console.log(`PASS ${name}${detail ? ` - ${detail}` : ""}`);
    return detail;
  } catch (error) {
    results.push({ name, passed: false });
    console.error(`FAIL ${name} - ${error.message}`);
    process.exitCode = 1;
    return null;
  }
}

async function login(email, password = seedPassword) {
  const response = await request("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  assert(response.status === 200 && response.data?.token, `Login failed for ${email}`);
  return response.data.token;
}

async function stockQuantity(token, productId, warehouseId) {
  const query = new URLSearchParams({ product: productId, warehouse: warehouseId });
  const response = await request(`/stock?${query}`, { token });
  assert(response.status === 200, "Could not read stock");
  const record = response.data?.stock?.find((item) =>
    String(item?.product?._id ?? item?.product) === String(productId)
  );
  return record?.quantity ?? 0;
}

async function run() {
  const seededAccounts = [
    ["admin@example.com", "admin"],
    ["manager1@example.com", "warehouseManager"],
    ["manager2@example.com", "warehouseManager"],
    ["supplier1@example.com", "supplier"],
    ["supplier2@example.com", "supplier"],
    ["sales1@example.com", "salesRepresentative"],
    ["sales2@example.com", "salesRepresentative"],
  ];
  const tokens = {};
  const loggedIn = await check("All seeded roles can log in", async () => {
    for (const [email, role] of seededAccounts) tokens[email] = await login(email);
    return `${seededAccounts.length} accounts`;
  });
  if (!loggedIn) return;

  const stamp = `${Date.now()}`;
  const adminToken = tokens["admin@example.com"];
  const createdUsers = {};
  const setup = await check("Admin creates users, warehouse, manager assignment, and Laptop", async () => {
    const roleDefinitions = [
      ["admin", "admin"],
      ["warehouseManager", "manager"],
      ["supplier", "supplier"],
      ["salesRepresentative", "sales"],
      ["salesRepresentative", "sales2"],
    ];
    for (const [role, key] of roleDefinitions) {
      const email = `api-${key}-${stamp}@example.com`;
      const created = await request("/users", {
        method: "POST",
        token: adminToken,
        body: { name: `API Test ${key}`, email, password: createdPassword, role },
      });
      assert(created.status === 201, `Could not create ${role}: ${created.data?.message || created.status}`);
      createdUsers[key] = { email, id: created.data?.user?._id };
      assert(createdUsers[key].id, `No ID returned for ${key}`);
    }

    const warehouse = await request("/warehouses", {
      method: "POST",
      token: adminToken,
      body: {
        name: `API Test Warehouse ${stamp}`,
        location: "QA District",
        capacity: 1000,
        manager: createdUsers.manager.id,
      },
    });
    assert(warehouse.status === 201, `Could not create warehouse: ${warehouse.data?.message || warehouse.status}`);
    createdUsers.warehouseId = warehouse.data?.warehouse?._id;
    assert(createdUsers.warehouseId, "No warehouse ID returned");

    const product = await request("/products", {
      method: "POST",
      token: adminToken,
      body: {
        name: "Laptop",
        description: "API test laptop",
        sku: `API-LAPTOP-${stamp}`,
        category: "Electronics",
        price: 80000,
        lowStockLimit: 5,
        supplier: createdUsers.supplier.id,
      },
    });
    assert(product.status === 201, `Could not create Laptop: ${product.data?.message || product.status}`);
    createdUsers.productId = product.data?.product?._id;
    assert(createdUsers.productId, "No product ID returned");

    const mouse = await request("/products", {
      method: "POST",
      token: adminToken,
      body: {
        name: "Mouse",
        description: "API test mouse",
        sku: `API-MOUSE-${stamp}`,
        category: "Accessories",
        price: 800,
        lowStockLimit: 10,
        supplier: createdUsers.supplier.id,
      },
    });
    assert(mouse.status === 201, `Could not create Mouse: ${mouse.data?.message || mouse.status}`);
    createdUsers.mouseId = mouse.data?.product?._id;
    assert(createdUsers.mouseId, "No Mouse ID returned");

    tokens.testManager = await login(createdUsers.manager.email, createdPassword);
    tokens.testSupplier = await login(createdUsers.supplier.email, createdPassword);
    tokens.testSales = await login(createdUsers.sales.email, createdPassword);
    tokens.testSales2 = await login(createdUsers.sales2.email, createdPassword);
    return "created all four roles and assigned the test warehouse";
  });
  if (!setup) return;

  const inventorySetup = await check("Manager stock-in/out leaves 17 and exactly two transactions", async () => {
    const from = new Date(Date.now() - 1000).toISOString();
    const stockIn = await request("/stock/in", {
      method: "POST",
      token: tokens.testManager,
      body: {
        product: createdUsers.productId,
        warehouse: createdUsers.warehouseId,
        quantity: 20,
        note: `API test ${stamp} stock-in`,
      },
    });
    assert(stockIn.status === 200, `Stock-in failed: ${stockIn.data?.message || stockIn.status}`);
    const stockOut = await request("/stock/out", {
      method: "POST",
      token: tokens.testManager,
      body: {
        product: createdUsers.productId,
        warehouse: createdUsers.warehouseId,
        quantity: 3,
        note: `API test ${stamp} stock-out`,
      },
    });
    assert(stockOut.status === 200, `Stock-out failed: ${stockOut.data?.message || stockOut.status}`);
    const query = new URLSearchParams({
      product: createdUsers.productId,
      warehouse: createdUsers.warehouseId,
      from,
      limit: "50",
    });
    const transactions = await request(`/transactions?${query}`, { token: adminToken });
    const quantity = await stockQuantity(tokens.testManager, createdUsers.productId, createdUsers.warehouseId);
    assert(transactions.status === 200, "Could not list transactions");
    assert(transactions.data?.transactions?.length === 2, "Expected exactly two new stock transactions");
    assert(quantity === 17, `Expected stock 17, found ${quantity}`);
    return "20 in, 3 out, stock 17";
  });
  if (!inventorySetup) return;

  let orderId;
  const orderFlow = await check("Sales order is pending at Rs. 160,000; processing deducts exactly once", async () => {
    const before = await stockQuantity(tokens.testManager, createdUsers.productId, createdUsers.warehouseId);
    const created = await request("/orders", {
      method: "POST",
      token: tokens.testSales,
      body: {
        customerName: "API Test Customer",
        customerPhone: "03001234567",
        warehouse: createdUsers.warehouseId,
        products: [{ product: createdUsers.productId, quantity: 2 }],
      },
    });
    assert(created.status === 201, `Order creation failed: ${created.data?.message || created.status}`);
    const order = created.data?.order;
    orderId = order?._id;
    assert(order?.status === "Pending", "Order did not start Pending");
    assert(order?.totalAmount === 160000, "Order total was not calculated from the database price");
    assert(await stockQuantity(tokens.testManager, createdUsers.productId, createdUsers.warehouseId) === before,
      "Pending order changed stock");

    const process = () => request(`/orders/${orderId}/status`, {
      method: "PUT",
      token: tokens.testManager,
      body: { status: "Processing" },
    });
    const processing = await process();
    assert(processing.status === 200, `Processing failed: ${processing.data?.message || processing.status}`);
    assert(await stockQuantity(tokens.testManager, createdUsers.productId, createdUsers.warehouseId) === 15,
      "Processing did not deduct exactly two units");

    const noteQuery = new URLSearchParams({ product: createdUsers.productId, note: `Order ${order.orderNumber}` });
    const orderTransactions = await request(`/transactions?${noteQuery}`, { token: adminToken });
    assert(orderTransactions.status === 200 && orderTransactions.data?.transactions?.length === 1,
      "Expected one order stock-out transaction");
    assert(orderTransactions.data.transactions[0]?.quantity === 2, "Order transaction quantity was incorrect");

    const repeated = await process();
    assert(repeated.status === 400, "Repeated Processing should return 400");
    assert(await stockQuantity(tokens.testManager, createdUsers.productId, createdUsers.warehouseId) === 15,
      "Repeated Processing changed stock");

    const completed = await request(`/orders/${orderId}/status`, {
      method: "PUT",
      token: tokens.testManager,
      body: { status: "Completed" },
    });
    assert(completed.status === 200 && completed.data?.order?.status === "Completed",
      "Processing order did not complete");
    assert(await stockQuantity(tokens.testManager, createdUsers.productId, createdUsers.warehouseId) === 15,
      "Completing changed stock");
    const processCompleted = await process();
    assert(processCompleted.status === 400, "Completed order should not process again");
    return "Pending -> Processing (17 to 15) -> Completed; repeat rejected";
  });
  if (!orderFlow) return;

  const transitions = await check("Invalid order transitions and over-stock order are rejected", async () => {
    const tooMany = await request("/orders", {
      method: "POST",
      token: tokens.testSales,
      body: {
        customerName: "Over-stock API Customer",
        customerPhone: "03001234568",
        warehouse: createdUsers.warehouseId,
        products: [{ product: createdUsers.productId, quantity: 16 }],
      },
    });
    assert(tooMany.status === 400, "Over-stock order should return 400");

    const pending = await request("/orders", {
      method: "POST",
      token: tokens.testSales,
      body: {
        customerName: "Pending Transition Customer",
        customerPhone: "03001234569",
        warehouse: createdUsers.warehouseId,
        products: [{ product: createdUsers.productId, quantity: 1 }],
      },
    });
    assert(pending.status === 201, "Could not create transition test order");
    const directComplete = await request(`/orders/${pending.data.order._id}/status`, {
      method: "PUT",
      token: tokens.testManager,
      body: { status: "Completed" },
    });
    assert(directComplete.status === 400, "Pending to Completed should return 400");
    const cancelled = await request(`/orders/${pending.data.order._id}/cancel`, {
      method: "PUT",
      token: tokens.testSales,
    });
    assert(cancelled.status === 200 && cancelled.data?.order?.status === "Cancelled",
      "Pending order could not be cancelled");
    const processCancelled = await request(`/orders/${pending.data.order._id}/status`, {
      method: "PUT",
      token: tokens.testManager,
      body: { status: "Processing" },
    });
    assert(processCancelled.status === 400, "Cancelled order should not process");
    return "over-stock, direct completion, and cancelled processing rejected";
  });
  if (!transitions) return;

  const rollback = await check("Multi-product processing rolls back earlier deductions on insufficient stock", async () => {
    const stockIn = await request("/stock/in", {
      method: "POST",
      token: tokens.testManager,
      body: {
        product: createdUsers.mouseId,
        warehouse: createdUsers.warehouseId,
        quantity: 5,
        note: `API rollback setup ${stamp}`,
      },
    });
    assert(stockIn.status === 200, "Could not stock the rollback test Mouse");
    const created = await request("/orders", {
      method: "POST",
      token: tokens.testSales,
      body: {
        customerName: "Rollback Test Customer",
        customerPhone: "03001234571",
        warehouse: createdUsers.warehouseId,
        products: [
          { product: createdUsers.productId, quantity: 2 },
          { product: createdUsers.mouseId, quantity: 3 },
        ],
      },
    });
    assert(created.status === 201, "Could not create two-product rollback order");
    const beforeLaptop = await stockQuantity(tokens.testManager, createdUsers.productId, createdUsers.warehouseId);
    const reduceMouse = await request("/stock/out", {
      method: "POST",
      token: tokens.testManager,
      body: {
        product: createdUsers.mouseId,
        warehouse: createdUsers.warehouseId,
        quantity: 3,
        note: `API rollback depletion ${stamp}`,
      },
    });
    assert(reduceMouse.status === 200, "Could not reduce Mouse stock after order creation");
    const processing = await request(`/orders/${created.data.order._id}/status`, {
      method: "PUT",
      token: tokens.testManager,
      body: { status: "Processing" },
    });
    assert(processing.status === 400, "Insufficient second product should reject processing");
    assert(processing.data?.message?.includes("Insufficient stock"), "Insufficient stock error was not clear");
    const persistedOrder = await request(`/orders/${created.data.order._id}`, { token: adminToken });
    assert(persistedOrder.status === 200 && persistedOrder.data?.order?.status === "Pending",
      "Failed processing did not restore the Pending order status");
    assert(await stockQuantity(tokens.testManager, createdUsers.productId, createdUsers.warehouseId) === beforeLaptop,
      "The first product's deduction was not rolled back");
    assert(await stockQuantity(tokens.testManager, createdUsers.mouseId, createdUsers.warehouseId) === 2,
      "Mouse stock changed despite its insufficient quantity");
    const txQuery = new URLSearchParams({
      product: createdUsers.productId,
      note: `Order ${created.data.order.orderNumber}`,
    });
    const transactions = await request(`/transactions?${txQuery}`, { token: adminToken });
    assert(transactions.status === 200 && transactions.data?.transactions?.length === 0,
      "A rolled-back order transaction was left behind");
    await request(`/orders/${created.data.order._id}/cancel`, {
      method: "PUT",
      token: tokens.testSales,
    });
    return "Laptop restored, Mouse unchanged, order Pending, no order transaction";
  });
  if (!rollback) return;

  const parallelProcessing = await check("Concurrent Processing requests deduct stock only once", async () => {
    const before = await stockQuantity(tokens.testManager, createdUsers.mouseId, createdUsers.warehouseId);
    assert(before >= 1, "Mouse stock is not available for the concurrent order test");
    const created = await request("/orders", {
      method: "POST",
      token: tokens.testSales,
      body: {
        customerName: "Concurrent Processing Customer",
        customerPhone: "03001234572",
        warehouse: createdUsers.warehouseId,
        products: [{ product: createdUsers.mouseId, quantity: 1 }],
      },
    });
    assert(created.status === 201, "Could not create concurrent processing order");
    const orderIdForRace = created.data.order._id;
    const responses = await Promise.all(Array.from({ length: 5 }, () =>
      request(`/orders/${orderIdForRace}/status`, {
        method: "PUT",
        token: tokens.testManager,
        body: { status: "Processing" },
      })
    ));
    assert(responses.filter((response) => response.status === 200).length === 1,
      "Expected exactly one successful Processing request");
    assert(responses.filter((response) => response.status === 400).length === 4,
      "Expected the other Processing requests to be rejected");
    assert(await stockQuantity(tokens.testManager, createdUsers.mouseId, createdUsers.warehouseId) === before - 1,
      "Concurrent Processing requests deducted stock more than once");
    const transactionQuery = new URLSearchParams({
      product: createdUsers.mouseId,
      note: `Order ${created.data.order.orderNumber}`,
    });
    const transactions = await request(`/transactions?${transactionQuery}`, { token: adminToken });
    assert(transactions.status === 200 && transactions.data?.transactions?.length === 1,
      "Expected one transaction for the concurrently processed order");
    const completed = await request(`/orders/${orderIdForRace}/status`, {
      method: "PUT",
      token: tokens.testManager,
      body: { status: "Completed" },
    });
    assert(completed.status === 200, "Could not complete concurrently processed order");
    return "one request processed the order; four were rejected";
  });
  if (!parallelProcessing) return;

  const authorization = await check("Role and ownership boundaries reject cross-account access", async () => {
    const manager2 = tokens["manager2@example.com"];
    const otherWarehouse = await request("/stock/out", {
      method: "POST",
      token: manager2,
      body: {
        product: createdUsers.productId,
        warehouse: createdUsers.warehouseId,
        quantity: 1,
      },
    });
    assert(otherWarehouse.status === 403, "Second manager accessed another manager's warehouse");
    const warehouseScopedPaths = [
      `/stock?warehouse=${createdUsers.warehouseId}`,
      `/stock/low?warehouse=${createdUsers.warehouseId}`,
      `/transactions?warehouse=${createdUsers.warehouseId}`,
      `/orders?warehouse=${createdUsers.warehouseId}`,
      `/supply-requests?warehouse=${createdUsers.warehouseId}`,
    ];
    for (const path of warehouseScopedPaths) {
      const response = await request(path, { token: manager2 });
      assert(response.status === 403, `Second manager accessed another warehouse through ${path.split("?")[0]}`);
    }
    const managerOrder = await request(`/orders/${orderId}`, { token: manager2 });
    assert(managerOrder.status === 403, "Second manager read an order in another manager's warehouse");
    const managerProductStock = await request(`/products/${createdUsers.productId}/stock`, { token: manager2 });
    assert(
      managerProductStock.status === 200 &&
        !(managerProductStock.data?.stock || []).some(
          (item) => String(item?.warehouse?._id) === String(createdUsers.warehouseId)
        ),
      "Product stock endpoint exposed another manager's warehouse"
    );
    const managerDashboard = await request("/dashboard/manager", { token: manager2 });
    assert(managerDashboard.status === 200, "Second manager could not load their own dashboard");
    assert(
      !(managerDashboard.data?.recentTransactions || []).some(
        (transaction) => String(transaction?.product?._id) === String(createdUsers.productId)
      ),
      "Manager dashboard exposed a product transaction from another warehouse"
    );

    const otherOrder = await request(`/orders/${orderId}`, { token: tokens.testSales2 });
    assert(otherOrder.status === 403, "Second sales representative read another user's order");
    const otherCancel = await request(`/orders/${orderId}/cancel`, {
      method: "PUT",
      token: tokens.testSales2,
    });
    assert(otherCancel.status === 403, "Second sales representative cancelled another user's order");

    const supplierAdminApi = await request("/users/suppliers", {
      token: tokens["supplier1@example.com"],
    });
    assert(supplierAdminApi.status === 403, "Supplier accessed the admin supplier API");
    const supplierManagerApi = await request("/dashboard/manager", {
      token: tokens["supplier1@example.com"],
    });
    assert(supplierManagerApi.status === 403, "Supplier accessed manager dashboard");
    const supplierSalesApi = await request("/orders", {
      token: tokens["supplier1@example.com"],
    });
    assert(supplierSalesApi.status === 403, "Supplier accessed sales orders");
    const supplierStockApi = await request("/stock/in", {
      method: "POST",
      token: tokens["supplier1@example.com"],
      body: {
        product: createdUsers.productId,
        warehouse: createdUsers.warehouseId,
        quantity: 1,
      },
    });
    assert(supplierStockApi.status === 403, "Supplier changed stock");
    const supplierOtherProduct = await request(`/products/${createdUsers.productId}`, {
      token: tokens["supplier2@example.com"],
    });
    assert(supplierOtherProduct.status === 403, "Supplier accessed another supplier's product");

    const publicAdmin = await request("/auth/register", {
      method: "POST",
      body: {
        name: "Public Admin",
        email: `api-public-admin-${stamp}@example.com`,
        password: createdPassword,
        role: "admin",
      },
    });
    assert(publicAdmin.status === 403, "Public registration accepted admin role");
    const noToken = await request("/products/categories");
    assert(noToken.status === 401, "Protected endpoint accepted a missing token");
    const invalidOrderId = await request("/orders/not-an-object-id", { token: adminToken });
    assert(invalidOrderId.status === 400, "Invalid order ObjectId should return 400");
    const missingOrderId = await request("/orders/ffffffffffffffffffffffff", { token: adminToken });
    assert(missingOrderId.status === 404, "Missing order should return 404");
    return "cross-warehouse, cross-owner, supplier-admin, public-admin, and anonymous calls rejected";
  });
  if (!authorization) return;

  const parallel = await check("Five concurrent full-stock removals never make stock negative", async () => {
    const available = await stockQuantity(tokens.testManager, createdUsers.productId, createdUsers.warehouseId);
    assert(available === 15, `Expected 15 units before parallel requests, found ${available}`);
    const requests = await Promise.all(Array.from({ length: 5 }, () =>
      request("/stock/out", {
        method: "POST",
        token: tokens.testManager,
        body: {
          product: createdUsers.productId,
          warehouse: createdUsers.warehouseId,
          quantity: available,
          note: `API parallel ${stamp}`,
        },
      })
    ));
    const successes = requests.filter((response) => response.status === 200).length;
    const finalQuantity = await stockQuantity(tokens.testManager, createdUsers.productId, createdUsers.warehouseId);
    assert(successes === 1, `Expected one successful removal, found ${successes}`);
    assert(finalQuantity === 0, `Expected final stock 0, found ${finalQuantity}`);
    assert(requests.every((response) => response.status === 200 || response.status === 400),
      "Unexpected response from concurrent stock removal");
    return "one successful removal; four rejected; final stock 0";
  });
  if (!parallel) return;

  await check("Supply approval adds stock once and rejects a repeat", async () => {
    const requestCreated = await request("/supply-requests", {
      method: "POST",
      token: tokens.testSupplier,
      body: {
        product: createdUsers.productId,
        warehouse: createdUsers.warehouseId,
        quantity: 3,
        note: `API test supply ${stamp}`,
      },
    });
    assert(requestCreated.status === 201, `Supply request failed: ${requestCreated.data?.message || requestCreated.status}`);
    const supplyId = requestCreated.data?.request?._id;
    const approved = await request(`/supply-requests/${supplyId}/status`, {
      method: "PUT",
      token: tokens.testManager,
      body: { status: "Approved", reviewNote: "API test approval" },
    });
    assert(approved.status === 200 && approved.data?.request?.status === "Approved",
      `Supply approval failed: ${approved.data?.message || approved.status}`);
    assert(await stockQuantity(tokens.testManager, createdUsers.productId, createdUsers.warehouseId) === 3,
      "Approval did not add exactly three units");
    const repeat = await request(`/supply-requests/${supplyId}/status`, {
      method: "PUT",
      token: tokens.testManager,
      body: { status: "Approved" },
    });
    assert(repeat.status === 400, "Repeated approval should return 400");
    assert(await stockQuantity(tokens.testManager, createdUsers.productId, createdUsers.warehouseId) === 3,
      "Repeated approval changed stock");
    const supplier2Read = await request(`/supply-requests/${supplyId}`, {
      token: tokens["supplier2@example.com"],
    });
    assert(supplier2Read.status === 403, "Supplier read another supplier's request");
    return "3 stock-in units and one transaction; repeat rejected";
  });

}

if (assertQaDatabase(process.env.MONGO_URI, "API tests")) {
  run().catch((error) => {
    console.error(`API test runner failed: ${error.message}`);
    process.exitCode = 1;
  }).finally(() => {
    const passed = results.filter((result) => result.passed).length;
    const failed = results.length - passed;
    console.log(`\nAPI test result: ${passed} passed, ${failed} failed.`);
  });
} else {
  process.exitCode = 1;
}
