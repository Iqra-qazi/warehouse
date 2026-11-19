import mongoose from "mongoose";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";
import Stock from "../models/stock.model.js";
import StockTransaction from "../models/stockTransaction.model.js";
import Order from "../models/order.model.js";
import SupplyRequest from "../models/supplyRequest.model.js";
import { deleteImage, verifyImage } from "../../services/storage.service.js";
import httpError from "../utils/httpError.js";

const WRITABLE_FIELDS = [
  "name",
  "description",
  "sku",
  "category",
  "price",
  "lowStockLimit",
  "imageUrl",
  "imageFileId",
  "supplier",
];
const PRODUCT_POPULATE = [
  { path: "supplier", select: "name email" },
  { path: "createdBy", select: "name" },
];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

function parseNumber(value) {
  if (typeof value !== "number" && typeof value !== "string") return NaN;
  if (typeof value === "string") {
    const normalized = value.trim();
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(normalized)) return NaN;
    return Number(normalized);
  }
  return value;
}

function normalizeText(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw httpError(400, `${label} is required`);
  }
  return value.trim();
}

function normalizeProductFields(input, partial) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw httpError(400, "Product data must be an object");
  }

  const body = {};
  for (const [field, label] of [["name", "Product name"], ["sku", "SKU"], ["category", "Category"]]) {
    if (!partial || input[field] !== undefined) {
      body[field] = normalizeText(input[field], label);
    }
  }
  if (body.sku) body.sku = body.sku.toUpperCase();

  if (input.description !== undefined) {
    if (input.description !== null && typeof input.description !== "string") {
      throw httpError(400, "Description must be text");
    }
    body.description = input.description === null ? "" : input.description.trim();
  }

  if (!partial || input.price !== undefined) {
    if (input.price === null || input.price === "" || input.price === undefined) {
      throw httpError(400, "Price is required");
    }
    const price = parseNumber(input.price);
    if (!Number.isFinite(price) || price < 0) {
      throw httpError(400, "Price must be a number greater than or equal to 0");
    }
    body.price = price;
  }

  if (input.lowStockLimit !== undefined) {
    const lowStockLimit = parseNumber(input.lowStockLimit);
    if (
      input.lowStockLimit === null ||
      input.lowStockLimit === "" ||
      !Number.isInteger(lowStockLimit) ||
      lowStockLimit < 0
    ) {
      throw httpError(400, "Low stock limit must be a non-negative integer");
    }
    body.lowStockLimit = lowStockLimit;
  }

  if (input.supplier !== undefined) {
    if (input.supplier === null || input.supplier === "") {
      body.supplier = null;
    } else if (
      typeof input.supplier !== "string" ||
      !mongoose.Types.ObjectId.isValid(input.supplier)
    ) {
      throw httpError(400, "A valid supplier ID is required");
    } else {
      body.supplier = input.supplier;
    }
  }

  const hasImageUrl = input.imageUrl !== undefined;
  const hasImageFileId = input.imageFileId !== undefined;
  if (hasImageUrl !== hasImageFileId) {
    throw httpError(400, "Image URL and file ID must be provided together");
  }
  if (hasImageUrl) {
    const imageUrl = input.imageUrl;
    const imageFileId = input.imageFileId;
    const urlIsEmpty = imageUrl === null || imageUrl === "";
    const fileIdIsEmpty = imageFileId === null || imageFileId === "";
    if (urlIsEmpty && fileIdIsEmpty) {
      body.imageUrl = null;
      body.imageFileId = null;
    } else if (
      typeof imageUrl === "string" &&
      imageUrl.trim() &&
      typeof imageFileId === "string" &&
      imageFileId.trim()
    ) {
      body.imageUrl = imageUrl;
      body.imageFileId = imageFileId;
    } else {
      throw httpError(400, "Image URL and file ID must both be valid");
    }
  }

  return body;
}

async function validateSupplier(supplierId) {
  if (supplierId === undefined || supplierId === null) return;
  const supplier = await User.findOne({ _id: supplierId, role: "supplier" });
  if (!supplier) throw httpError(400, "Supplier must be an existing supplier account");
}

async function verifyProductImage(body) {
  if (body.imageFileId) {
    const image = await verifyImage(body.imageFileId, body.imageUrl);
    body.imageUrl = image.url;
    body.imageFileId = image.fileId;
  }
}

async function ensureSkuAvailable(sku, excludeId) {
  const filter = { sku };
  if (excludeId) filter._id = { $ne: excludeId };
  if (await Product.exists(filter)) throw httpError(409, "A product with this SKU already exists");
}

export async function listProducts(req, res) {
  const page = parsePageValue(req.query.page, 1);
  const limit = parsePageValue(req.query.limit, 10, 50);
  const filter = {};
  if (req.query.search) {
    const search = escapeRegex(String(req.query.search).slice(0, 100));
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { sku: { $regex: search, $options: "i" } },
    ];
  }
  if (req.query.category) filter.category = String(req.query.category);
  if (req.user.role === "supplier") {
    filter.supplier = req.user._id;
  } else if (req.query.supplier) {
    if (!mongoose.Types.ObjectId.isValid(req.query.supplier)) {
      throw httpError(400, "A valid supplier ID is required");
    }
    filter.supplier = req.query.supplier;
  }

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate(PRODUCT_POPULATE)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(filter),
  ]);
  res.json({ products, total, page, pages: Math.ceil(total / limit) });
}

export async function listProductCategories(req, res) {
  const filter = req.user.role === "supplier" ? { supplier: req.user._id } : {};
  const categories = await Product.distinct("category", filter);
  categories.sort((left, right) => left.localeCompare(right));
  res.json({ categories });
}

export async function getProduct(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw httpError(400, "Invalid product ID");
  const product = await Product.findById(req.params.id);
  if (!product) throw httpError(404, "Product not found");
  if (
    req.user.role === "supplier" &&
    String(product.supplier || "") !== String(req.user._id)
  ) {
    throw httpError(403, "Suppliers can only view their own products");
  }
  await product.populate(PRODUCT_POPULATE);
  res.json({ product });
}

export async function getProductStock(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw httpError(400, "Invalid product ID");
  const product = await Product.findById(req.params.id).select("supplier");
  if (!product) throw httpError(404, "Product not found");
  if (
    req.user.role === "supplier" &&
    String(product.supplier || "") !== String(req.user._id)
  ) {
    throw httpError(403, "Suppliers can only view stock for their own products");
  }
  const filter = { product: req.params.id };
  if (req.user.role === "warehouseManager") {
    const manager = await User.findById(req.user._id).select("assignedWarehouses").lean();
    filter.warehouse = { $in: manager?.assignedWarehouses ?? [] };
  }
  const records = await Stock.find(filter)
    .populate("warehouse", "name location")
    .sort({ "warehouse.name": 1 });
  res.json({ stock: records });
}

export async function createProduct(req, res) {
  const body = normalizeProductFields(req.body, false);
  await ensureSkuAvailable(body.sku);
  await validateSupplier(body.supplier);
  await verifyProductImage(body);

  const product = await Product.create({
    ...Object.fromEntries(
      WRITABLE_FIELDS.filter((field) => body[field] !== undefined)
        .map((field) => [field, body[field]])
    ),
    createdBy: req.user._id,
  });
  await product.populate(PRODUCT_POPULATE);
  res.status(201).json({ product });
}

export async function updateProduct(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw httpError(400, "Invalid product ID");
  const product = await Product.findById(req.params.id);
  if (!product) throw httpError(404, "Product not found");

  const body = normalizeProductFields(req.body, true);
  if (body.sku !== undefined) await ensureSkuAvailable(body.sku, product._id);
  await validateSupplier(body.supplier);
  await verifyProductImage(body);

  const oldFileId = product.imageFileId;
  for (const field of WRITABLE_FIELDS) {
    if (body[field] !== undefined) product[field] = body[field];
  }
  await product.save();
  if (oldFileId && oldFileId !== product.imageFileId) await deleteImage(oldFileId);
  await product.populate(PRODUCT_POPULATE);
  res.json({ product });
}

export async function deleteProduct(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw httpError(400, "Invalid product ID");
  const product = await Product.findById(req.params.id);
  if (!product) throw httpError(404, "Product not found");
  const referenced = await Promise.all([
    Stock.exists({ product: product._id }),
    StockTransaction.exists({ product: product._id }),
    Order.exists({ "products.product": product._id }),
    SupplyRequest.exists({ product: product._id }),
  ]);
  if (referenced.some(Boolean)) {
    throw httpError(409, "Product is referenced by stock, orders, or supply requests");
  }
  if (product.imageFileId) await deleteImage(product.imageFileId);
  await product.deleteOne();
  res.json({ message: "Product deleted" });
}
