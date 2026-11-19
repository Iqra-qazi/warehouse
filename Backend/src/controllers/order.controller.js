import mongoose from "mongoose";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import Stock from "../models/stock.model.js";
import StockTransaction from "../models/stockTransaction.model.js";
import Warehouse from "../models/warehouse.model.js";
import User from "../models/user.model.js";
import { removeStock } from "../services/stock.service.js";
import httpError from "../utils/httpError.js";

function isTransactionsUnsupported(error) {
  return (
    error.code === 20 ||
    error.codeName === "IllegalOperation" ||
    /replica set|transaction numbers are only allowed|does not support transactions/i.test(error.message || "")
  );
}

async function processOrderWithSession(orderId, actorId) {
  const session = await mongoose.startSession();
  try {
    let orderResult;
    await session.withTransaction(async () => {
      const order = await Order.findOneAndUpdate(
        { _id: orderId, status: "Pending" },
        { $set: { status: "Processing" } },
        { new: true, session }
      );
      if (!order) throw httpError(409, "Order processing claim was lost");

      for (const item of order.products) {
        try {
          await removeStock({
            product: item.product,
            warehouse: order.warehouse,
            quantity: item.quantity,
            note: `Order ${order.orderNumber}`,
            performedBy: actorId,
            session,
          });
        } catch (error) {
          if (error.status !== 400) throw error;
          const current = await Stock.findOne({
            product: item.product,
            warehouse: order.warehouse,
          }).select("quantity").session(session).lean();
          const product = await Product.findById(item.product).select("name").session(session).lean();
          throw httpError(
            400,
            `Insufficient stock for ${product?.name || "product"}. Available: ${current?.quantity ?? 0}`
          );
        }
      }
      orderResult = order;
    });
    return orderResult;
  } finally {
    await session.endSession();
  }
}

async function processOrderFallback(orderId, actorId) {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, status: "Pending" },
    { $set: { status: "Processing" } },
    { new: true }
  );
  if (!order) throw httpError(409, "Order processing claim was lost");

  const deducted = [];
  try {
    for (const item of order.products) {
      try {
        const result = await removeStock({
          product: item.product,
          warehouse: order.warehouse,
          quantity: item.quantity,
          note: `Order ${order.orderNumber}`,
          performedBy: actorId,
        });
        deducted.push({ item, transactionId: result.transaction._id });
      } catch (error) {
        if (error.status !== 400) throw error;
        const [current, product] = await Promise.all([
          Stock.findOne({ product: item.product, warehouse: order.warehouse }).select("quantity").lean(),
          Product.findById(item.product).select("name").lean(),
        ]);
        throw httpError(
          400,
          `Insufficient stock for ${product?.name || "product"}. Available: ${current?.quantity ?? 0}`
        );
      }
    }
    return order;
  } catch (error) {
    try {
      for (const { item } of deducted) {
        const restored = await Stock.findOneAndUpdate(
          { product: item.product, warehouse: order.warehouse },
          { $inc: { quantity: item.quantity } },
          { new: true }
        );
        if (!restored) throw new Error("Could not restore stock after order processing failed");
      }
      if (deducted.length) {
        await StockTransaction.deleteMany({
          _id: { $in: deducted.map(({ transactionId }) => transactionId) },
        });
      }
      const reset = await Order.updateOne(
        { _id: order._id, status: "Processing" },
        { $set: { status: "Pending" } }
      );
      if (reset.modifiedCount !== 1) {
        throw new Error("Could not return the order to Pending after stock rollback");
      }
    } catch (rollbackError) {
      rollbackError.cause = error;
      throw rollbackError;
    }
    throw error;
  }
}

export async function createOrder(req, res) {
  const { customerName, customerPhone, warehouse, products } = req.body;
  const cleanName = typeof customerName === "string" ? customerName.trim() : "";
  const cleanPhone = typeof customerPhone === "string" ? customerPhone.trim() : "";
  if (!cleanName || !cleanPhone) {
    throw httpError(400, "Customer name and phone are required");
  }
  if (!/^[0-9+\-\s]{7,15}$/.test(cleanPhone) ||
      (cleanPhone.match(/\d/g)?.length ?? 0) < 7 ||
      (cleanPhone.match(/\d/g)?.length ?? 0) > 15) {
    throw httpError(400, "Phone must contain 7 to 15 digits, spaces, + or - characters");
  }
  if (!Array.isArray(products) || !products.length) {
    throw httpError(400, "Customer details, warehouse, and products are required");
  }
  if (!mongoose.Types.ObjectId.isValid(warehouse)) throw httpError(400, "Invalid warehouse ID");
  if (!(await Warehouse.exists({ _id: warehouse }))) throw httpError(404, "Warehouse not found");

  const productIds = products.map((line) => String(line.product));
  if (new Set(productIds).size !== productIds.length) {
    throw httpError(400, "Duplicate product lines are not allowed");
  }
  if (products.some((line) =>
    !mongoose.Types.ObjectId.isValid(line.product) ||
    !Number.isInteger(line.quantity) ||
    line.quantity <= 0
  )) {
    throw httpError(400, "Each product requires a valid ID and positive integer quantity");
  }

  const records = await Product.find({ _id: { $in: productIds } });
  if (records.length !== products.length) throw httpError(404, "One or more products were not found");
  const productMap = new Map(records.map((product) => [String(product._id), product]));
  const orderLines = products.map((line) => ({
    product: line.product,
    quantity: line.quantity,
    price: productMap.get(String(line.product)).price,
  }));
  for (const line of orderLines) {
    const stock = await Stock.findOne({ product: line.product, warehouse });
    const available = stock?.quantity ?? 0;
    if (available < line.quantity) {
      const product = productMap.get(String(line.product));
      throw httpError(400, `Insufficient stock for ${product.name}. Available: ${available}`);
    }
  }

  const order = await Order.create({
    orderNumber: `ORD-${Date.now()}-${new mongoose.Types.ObjectId().toString().slice(-6).toUpperCase()}`,
    customerName: cleanName,
    customerPhone: cleanPhone,
    products: orderLines,
    totalAmount: orderLines.reduce((sum, line) => sum + line.quantity * line.price, 0),
    warehouse,
    createdBy: req.user._id,
    status: "Pending",
  });
  await order.populate(["products.product", "warehouse", "createdBy"]);
  res.status(201).json({ order });
}

export async function listOrders(req, res) {
  const filter = {};
  if (req.user.role === "salesRepresentative") {
    filter.createdBy = req.user._id;
  } else if (req.user.role === "warehouseManager") {
    const currentUser = await User.findById(req.user._id).select("assignedWarehouses").lean();
    filter.warehouse = { $in: currentUser?.assignedWarehouses ?? [] };
  }
  if (req.query.status) {
    if (!["Pending", "Processing", "Completed", "Cancelled"].includes(String(req.query.status))) {
      throw httpError(400, "Invalid order status");
    }
    filter.status = req.query.status;
  }
  if (req.query.search) {
    const escaped = String(req.query.search).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { orderNumber: { $regex: escaped, $options: "i" } },
      { customerName: { $regex: escaped, $options: "i" } },
    ];
  }
  if (req.query.warehouse) {
    if (!mongoose.Types.ObjectId.isValid(req.query.warehouse)) {
      throw httpError(400, "Invalid warehouse ID");
    }
    if (req.user.role === "warehouseManager") {
      const currentUser = await User.findById(req.user._id).select("assignedWarehouses").lean();
      const assigned = currentUser?.assignedWarehouses ?? [];
      if (!assigned.some((id) => String(id) === String(req.query.warehouse))) {
        throw httpError(403, "Warehouse access denied");
      }
    }
    filter.warehouse = req.query.warehouse;
  }
  if (req.query.from || req.query.to) {
    const createdAt = {};
    if (req.query.from) createdAt.$gte = new Date(req.query.from);
    if (req.query.to) {
      createdAt.$lte = new Date(req.query.to);
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(req.query.to))) {
        createdAt.$lte.setUTCHours(23, 59, 59, 999);
      }
    }
    if (Object.values(createdAt).some((date) => Number.isNaN(date.getTime())) ||
        (createdAt.$gte && createdAt.$lte && createdAt.$gte > createdAt.$lte)) {
      throw httpError(400, "Invalid order date range");
    }
    filter.createdAt = createdAt;
  }
  const page = Number(req.query.page ?? 1);
  const requestedLimit = Number(req.query.limit ?? 10);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(requestedLimit) || requestedLimit < 1) {
    throw httpError(400, "page and limit must be positive integers");
  }
  const limit = Math.min(requestedLimit, 50);
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("products.product", "name sku imageUrl")
      .populate("warehouse", "name")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Order.countDocuments(filter),
  ]);
  res.json({ orders, total, page, pages: Math.ceil(total / limit) });
}

export async function getOrder(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw httpError(400, "Invalid order ID");
  const order = await Order.findById(req.params.id)
    .populate("products.product")
    .populate("warehouse")
    .populate("createdBy", "name email role");
  if (!order) throw httpError(404, "Order not found");

  const isOwner = String(order.createdBy?._id) === String(req.user._id);
  let isManager = false;
  if (req.user.role === "warehouseManager") {
    const currentUser = await User.findById(req.user._id).select("assignedWarehouses").lean();
    isManager = (currentUser?.assignedWarehouses ?? [])
      .some((id) => String(id) === String(order.warehouse._id));
  }
  if (req.user.role !== "admin" && !isOwner && !isManager) {
    throw httpError(403, "Order access denied");
  }
  res.json({ order });
}

export async function updateOrderStatus(req, res) {
  const { status } = req.body;
  if (!["Processing", "Completed"].includes(status)) {
    throw httpError(400, "Only Processing or Completed status can be requested");
  }
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw httpError(400, "Invalid order ID");
  }
  const existing = await Order.findById(req.params.id);
  if (!existing) throw httpError(404, "Order not found");
  if (req.user.role === "warehouseManager") {
    const manager = await User.findById(req.user._id).select("assignedWarehouses").lean();
    const assigned = manager?.assignedWarehouses ?? [];
    if (!assigned.some((id) => String(id) === String(existing.warehouse))) {
      throw httpError(403, "Warehouse access denied");
    }
  }

  let order;
  if (status === "Processing") {
    if (process.env.USE_MONGO_TRANSACTIONS === "true") {
      try {
        order = await processOrderWithSession(existing._id, req.user._id);
      } catch (error) {
        if (!isTransactionsUnsupported(error)) {
          if (error.status === 409) {
            order = null;
          } else {
            throw error;
          }
        }
      }
    }
    if (!order && process.env.USE_MONGO_TRANSACTIONS === "true") {
      const current = await Order.findById(existing._id);
      if (!current) throw httpError(404, "Order not found");
      if (current.status !== "Pending") {
        throw httpError(400, processingTransitionError(current.status));
      }
      try {
        order = await processOrderFallback(existing._id, req.user._id);
      } catch (error) {
        if (error.status !== 409) throw error;
        const latest = await Order.findById(existing._id);
        if (!latest) throw httpError(404, "Order not found");
        throw httpError(400, processingTransitionError(latest.status));
      }
    } else if (!order) {
      try {
        order = await processOrderFallback(existing._id, req.user._id);
      } catch (error) {
        if (error.status !== 409) throw error;
        const latest = await Order.findById(existing._id);
        if (!latest) throw httpError(404, "Order not found");
        throw httpError(400, processingTransitionError(latest.status));
      }
    }
  } else {
    order = await Order.findOneAndUpdate(
      { _id: existing._id, status: "Processing" },
      { $set: { status: "Completed" } },
      { new: true }
    );
    if (!order) {
      const current = await Order.findById(existing._id);
      if (!current) throw httpError(404, "Order not found");
      throw httpError(400, completedTransitionError(current.status));
    }
  }
  await order.populate(["products.product", "warehouse", "createdBy"]);
  res.json({ order });
}

function processingTransitionError(currentStatus) {
  if (currentStatus === "Processing") return "Order is already Processing";
  if (currentStatus === "Completed" || currentStatus === "Cancelled") {
    return "Completed or cancelled orders cannot be processed again";
  }
  return "Only Pending orders can be processed";
}

function completedTransitionError(currentStatus) {
  if (currentStatus === "Pending") return "Cannot move from Pending to Completed";
  if (currentStatus === "Completed") return "Order is already Completed";
  if (currentStatus === "Cancelled") return "Cancelled orders cannot be completed";
  return "Only Processing orders can be completed";
}

export async function cancelOrder(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw httpError(400, "Invalid order ID");
  }
  const filter = { _id: req.params.id, status: "Pending" };
  if (req.user.role !== "admin") filter.createdBy = req.user._id;
  const order = await Order.findOneAndUpdate(
    filter,
    { $set: { status: "Cancelled" } },
    { new: true }
  );
  if (!order) {
    const exists = await Order.exists({ _id: req.params.id });
    if (!exists) throw httpError(404, "Order not found");
    if (req.user.role !== "admin" && !(await Order.exists({ _id: req.params.id, createdBy: req.user._id }))) {
      throw httpError(403, "Order access denied");
    }
    throw httpError(400, "Only pending orders can be cancelled");
  }
  res.json({ order });
}
