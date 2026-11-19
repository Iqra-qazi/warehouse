import mongoose from "mongoose";
import Product from "../models/product.model.js";
import Warehouse from "../models/warehouse.model.js";
import Stock from "../models/stock.model.js";
import StockTransaction from "../models/stockTransaction.model.js";
import {
  addStock as addStockOperation,
  removeStock as removeStockOperation,
} from "../services/stock.service.js";
import httpError from "../utils/httpError.js";

function parsePageValue(value, fallback, maximum) {
  if (value === undefined) return fallback;
  if (typeof value !== "string" && typeof value !== "number") {
    throw httpError(400, "page and limit must be positive integers");
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw httpError(400, "page and limit must be positive integers");
  }
  return maximum ? Math.min(parsed, maximum) : parsed;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function assignedWarehouseIds(user) {
  return Array.isArray(user?.assignedWarehouses) ? user.assignedWarehouses : [];
}

function ensureManagerWarehouse(user, warehouseId) {
  if (
    user.role === "warehouseManager" &&
    !assignedWarehouseIds(user).some((id) => String(id) === String(warehouseId))
  ) {
    throw httpError(403, "Warehouse access denied");
  }
}

async function changeStock(req, res, operation) {
  const { product, warehouse, quantity, note } = req.body;
  if (!mongoose.Types.ObjectId.isValid(product) || !mongoose.Types.ObjectId.isValid(warehouse)) {
    throw httpError(400, "Valid product and warehouse IDs are required");
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw httpError(400, "quantity must be a positive integer");
  }
  if (note !== undefined && (typeof note !== "string" || note.length > 500)) {
    throw httpError(400, "note must be text no longer than 500 characters");
  }
  ensureManagerWarehouse(req.user, warehouse);

  const [productExists, warehouseExists] = await Promise.all([
    Product.exists({ _id: product }),
    Warehouse.exists({ _id: warehouse }),
  ]);
  if (!productExists || !warehouseExists) throw httpError(404, "Product or warehouse not found");

  const result = await operation({
    product,
    warehouse,
    quantity,
    performedBy: req.user._id,
    note,
  });
  await result.stock.populate([
    { path: "product", select: "name sku category price lowStockLimit imageUrl" },
    { path: "warehouse", select: "name location" },
  ]);
  await result.transaction.populate([
    { path: "product", select: "name sku" },
    { path: "warehouse", select: "name" },
    { path: "performedBy", select: "name role" },
  ]);
  res.json({ stock: result.stock, transaction: result.transaction });
}

export async function stockIn(req, res) {
  return changeStock(req, res, addStockOperation);
}

export async function stockOut(req, res) {
  return changeStock(req, res, removeStockOperation);
}

export async function getStock(req, res) {
  const page = parsePageValue(req.query.page, 1);
  const limit = parsePageValue(req.query.limit, 10, 50);
  const filter = {};
  if (req.user.role === "warehouseManager") {
    filter.warehouse = { $in: assignedWarehouseIds(req.user) };
  }
  if (req.query.warehouse) {
    if (!mongoose.Types.ObjectId.isValid(req.query.warehouse)) {
      if (req.user.role === "warehouseManager") {
        throw httpError(403, "Warehouse access denied");
      }
      throw httpError(400, "Invalid warehouse ID");
    }
    ensureManagerWarehouse(req.user, req.query.warehouse);
    filter.warehouse = req.query.warehouse;
  }

  const productFilter = {};
  if (req.query.product) {
    if (!mongoose.Types.ObjectId.isValid(req.query.product)) {
      throw httpError(400, "Invalid product ID");
    }
    productFilter._id = req.query.product;
  }
  if (req.query.search) {
    const search = escapeRegex(String(req.query.search).slice(0, 100));
    productFilter.$or = [
      { name: { $regex: search, $options: "i" } },
      { sku: { $regex: search, $options: "i" } },
    ];
  }
  if (Object.keys(productFilter).length) {
    const products = await Product.find(productFilter).select("_id").lean();
    filter.product = { $in: products.map((product) => product._id) };
  }

  const [records, total] = await Promise.all([
    Stock.find(filter)
      .populate("product", "name sku category price lowStockLimit imageUrl")
      .populate("warehouse", "name location")
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Stock.countDocuments(filter),
  ]);
  const stock = records.map((record) => {
    const item = record.toObject();
    item.isLowStock = Boolean(
      item.product && item.quantity <= item.product.lowStockLimit
    );
    return item;
  });
  res.json({ stock, total, page, pages: Math.ceil(total / limit) });
}

export async function getLowStock(req, res) {
  const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
  const page = parsePageValue(req.query.page, 1);
  const limit = parsePageValue(req.query.limit, 10, 50);
  const match = {};
  if (req.user.role === "warehouseManager") {
    match.warehouse = { $in: assignedWarehouseIds(req.user) };
  }
  if (req.query.warehouse) {
    if (!mongoose.Types.ObjectId.isValid(req.query.warehouse)) {
      throw httpError(400, "Invalid warehouse ID");
    }
    ensureManagerWarehouse(req.user, req.query.warehouse);
    match.warehouse = new mongoose.Types.ObjectId(req.query.warehouse);
  }

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: "products",
        localField: "product",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    { $match: { $expr: { $lte: ["$quantity", "$product.lowStockLimit"] } } },
    {
      $lookup: {
        from: "warehouses",
        localField: "warehouse",
        foreignField: "_id",
        as: "warehouse",
      },
    },
    { $unwind: "$warehouse" },
    {
      $project: {
        _id: 1,
        quantity: 1,
        lowStockLimit: "$product.lowStockLimit",
        product: {
          _id: "$product._id",
          name: "$product.name",
          sku: "$product.sku",
          category: "$product.category",
          price: "$product.price",
          imageUrl: "$product.imageUrl",
        },
        warehouse: {
          _id: "$warehouse._id",
          name: "$warehouse.name",
          location: "$warehouse.location",
        },
      },
    },
  ];
  const [stock, countRows] = await Promise.all([
    Stock.aggregate([
      ...pipeline,
      { $sort: { quantity: 1, "product.name": 1 } },
      ...(hasPagination ? [{ $skip: (page - 1) * limit }, { $limit: limit }] : []),
    ]),
    hasPagination ? Stock.aggregate([...pipeline, { $count: "total" }]) : Promise.resolve([]),
  ]);
  const total = hasPagination ? countRows[0]?.total ?? 0 : stock.length;
  res.json({ stock, total, page, pages: hasPagination ? Math.ceil(total / limit) : 1 });
}

export async function getTransactions(req, res) {
  const page = parsePageValue(req.query.page, 1);
  const limit = parsePageValue(req.query.limit, 10, 50);
  const filter = {};
  if (req.user.role === "warehouseManager") {
    filter.warehouse = { $in: assignedWarehouseIds(req.user) };
  }
  if (req.query.warehouse) {
    if (!mongoose.Types.ObjectId.isValid(req.query.warehouse)) {
      throw httpError(400, "Invalid warehouse ID");
    }
    ensureManagerWarehouse(req.user, req.query.warehouse);
    filter.warehouse = req.query.warehouse;
  }
  if (req.query.product) {
    if (!mongoose.Types.ObjectId.isValid(req.query.product)) {
      throw httpError(400, "Invalid product ID");
    }
    filter.product = req.query.product;
  }
  if (req.query.search) {
    const search = escapeRegex(String(req.query.search).slice(0, 100));
    const matchingProducts = await Product.find({
      $or: [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ],
    }).select("_id").lean();
    const matchingIds = matchingProducts.map((product) => product._id);
    if (filter.product) {
      filter.product = matchingIds.some((id) => String(id) === String(filter.product))
        ? filter.product
        : { $in: [] };
    } else {
      filter.product = { $in: matchingIds };
    }
  }
  if (req.query.type) {
    if (!["stock-in", "stock-out"].includes(req.query.type)) {
      throw httpError(400, "type must be stock-in or stock-out");
    }
    filter.transactionType = req.query.type;
  }
  if (req.query.note) {
    const note = escapeRegex(String(req.query.note).slice(0, 100));
    filter.note = { $regex: note, $options: "i" };
  }
  if (req.query.from || req.query.to) {
    const date = {};
    if (req.query.from) date.$gte = new Date(req.query.from);
    if (req.query.to) {
      date.$lte = new Date(req.query.to);
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(req.query.to))) {
        date.$lte.setUTCHours(23, 59, 59, 999);
      }
    }
    if (
      Object.values(date).some((value) => Number.isNaN(value.getTime())) ||
      (date.$gte && date.$lte && date.$gte > date.$lte)
    ) {
      throw httpError(400, "Invalid transaction date range");
    }
    filter.date = date;
  }

  const summaryFilter = { ...filter };
  for (const key of ["warehouse", "product"]) {
    const value = summaryFilter[key];
    if (typeof value === "string" && mongoose.Types.ObjectId.isValid(value)) {
      summaryFilter[key] = new mongoose.Types.ObjectId(value);
    } else if (value?.$in) {
      summaryFilter[key] = {
        $in: value.$in.map((id) =>
          typeof id === "string" && mongoose.Types.ObjectId.isValid(id)
            ? new mongoose.Types.ObjectId(id)
            : id
        ),
      };
    }
  }
  const [transactions, total, summaryRows] = await Promise.all([
    StockTransaction.find(filter)
      .populate("product", "name sku")
      .populate("warehouse", "name")
      .populate("performedBy", "name role")
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    StockTransaction.countDocuments(filter),
    StockTransaction.aggregate([
      { $match: summaryFilter },
      { $group: { _id: "$transactionType", quantity: { $sum: "$quantity" } } },
    ]),
  ]);
  const summary = { totalIn: 0, totalOut: 0 };
  for (const row of summaryRows) {
    if (row._id === "stock-in") summary.totalIn = row.quantity;
    if (row._id === "stock-out") summary.totalOut = row.quantity;
  }
  res.json({ transactions, total, page, pages: Math.ceil(total / limit), summary });
}
