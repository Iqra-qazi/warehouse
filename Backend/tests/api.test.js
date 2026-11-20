import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import app from "../src/app.js";
import warehouseAccess from "../src/middlewares/warehouseAccess.js";
import authorizeRoles from "../src/middlewares/role.js";
import Order from "../src/models/order.model.js";
import Product from "../src/models/product.model.js";
import User from "../src/models/user.model.js";
import { getMongoDatabaseName, isQaDatabase } from "../src/utils/qaDatabaseGuard.js";

let server;
let baseUrl;

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});

test("health endpoint responds without database access", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("login preflight permits the configured origin and rejects other origins", async () => {
  const allowedResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: "OPTIONS",
    headers: {
      Origin: "http://localhost:5173",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "authorization,content-type",
    },
  });

  assert.equal(allowedResponse.status, 204);
  assert.equal(allowedResponse.headers.get("access-control-allow-origin"), "http://localhost:5173");
  assert.equal(allowedResponse.headers.get("access-control-allow-credentials"), null);
  assert.match(allowedResponse.headers.get("access-control-allow-methods"), /POST/);
  assert.match(allowedResponse.headers.get("access-control-allow-headers"), /Authorization/i);

  const deniedResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: "OPTIONS",
    headers: {
      Origin: "https://untrusted.example",
      "Access-Control-Request-Method": "POST",
    },
  });
  assert.equal(deniedResponse.headers.get("access-control-allow-origin"), null);
});

test("root endpoint rejects requests without credentials", async () => {
  const response = await fetch(`${baseUrl}/`);
  assert.equal(response.status, 401);
});

test("logout endpoint rejects requests without credentials", async () => {
  const response = await fetch(`${baseUrl}/api/auth/logout`, { method: "POST" });
  assert.equal(response.status, 401);
});

test("public registration rejects an admin role", async () => {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Unauthorized Admin",
      email: "attacker@example.com",
      password: "A-long-test-password",
      role: "admin",
    }),
  });
  assert.equal(response.status, 403);
  assert.match((await response.json()).message, /cannot create administrators/i);
});

test("protected profile endpoint rejects missing credentials", async () => {
  const response = await fetch(`${baseUrl}/api/auth/me`);
  assert.equal(response.status, 401);
});

test("product category endpoint is protected", async () => {
  const response = await fetch(`${baseUrl}/api/products/categories`);
  assert.equal(response.status, 401);
});

test("product model normalizes SKU and defaults the low-stock limit", async () => {
  const product = new Product({
    name: "Widget",
    sku: " widget-1 ",
    category: "Tools",
    price: 0,
    createdBy: new mongoose.Types.ObjectId(),
  });
  assert.equal(product.sku, "WIDGET-1");
  assert.equal(product.lowStockLimit, 10);
  await assert.doesNotReject(product.validate());
});

test("product model rejects fractional low-stock limits", async () => {
  const product = new Product({
    name: "Widget",
    sku: "WIDGET-2",
    category: "Tools",
    price: 1,
    lowStockLimit: 1.5,
    createdBy: new mongoose.Types.ObjectId(),
  });

  test("order model rejects fractional item quantities", async () => {
    const order = new Order({
      orderNumber: "TEST-FRACTIONAL-001",
      customerName: "Test Customer",
      customerPhone: "03001234567",
      products: [{
        product: new mongoose.Types.ObjectId(),
        quantity: 1.5,
        price: 100,
      }],
      totalAmount: 150,
      warehouse: new mongoose.Types.ObjectId(),
      createdBy: new mongoose.Types.ObjectId(),
    });
    await assert.rejects(order.validate(), (error) => {
      assert.match(error.errors["products.0.quantity"].message, /integer/);
      return true;
    });
  });
  await assert.rejects(product.validate(), (error) => {
    assert.match(error.errors.lowStockLimit.message, /integer/);
    return true;
  });
});

async function callWarehouseAccess(assignedWarehouses, warehouseId) {
  const originalFindById = User.findById;
  User.findById = () => ({
    select: async () => ({ role: "warehouseManager", assignedWarehouses }),
  });
  let status;
  let advanced = false;
  try {
    await warehouseAccess(
      {
        user: { _id: "64b000000000000000000010", role: "warehouseManager" },
        body: { warehouse: warehouseId },
        params: {},
        query: {},
      },
      { status(code) { status = code; return this; }, json() {} },
      () => { advanced = true; }
    );
  } finally {
    User.findById = originalFindById;
  }
  return { status, advanced };
}

test("warehouse manager cannot access another manager's warehouse", async () => {
  const { status, advanced } = await callWarehouseAccess(
    ["64b000000000000000000001"],
    "64b000000000000000000002"
  );
  assert.equal(status, 403);
  assert.equal(advanced, false);
});

test("warehouse manager may access an assigned warehouse", async () => {
  const { status, advanced } = await callWarehouseAccess(
    ["64b000000000000000000001"],
    "64b000000000000000000001"
  );
  assert.equal(status, undefined);
  assert.equal(advanced, true);
});

test("role middleware rejects suppliers from admin routes", () => {
  let status;
  let advanced = false;
  authorizeRoles("admin")(
    { user: { role: "supplier" } },
    { status(code) { status = code; return this; }, json() {} },
    () => { advanced = true; }
  );
  assert.equal(status, 403);
  assert.equal(advanced, false);
});

test("user JSON never includes the stored password", () => {
  const user = new User({
    name: "Test User",
    email: "test@example.com",
    password: "already-hashed-value",
  });
  assert.equal(user.toJSON().password, undefined);
});

test("QA guard accepts only database names ending in _qa or _test", () => {
  assert.equal(getMongoDatabaseName("mongodb://user:pass@localhost:27017/inventory_qa"), "inventory_qa");
  assert.equal(isQaDatabase("mongodb+srv://user:pass@cluster.example/db_test?retryWrites=true"), true);
  assert.equal(isQaDatabase("mongodb://localhost:27017/inventory"), false);
  assert.equal(isQaDatabase("not-a-mongodb-uri"), false);
});
