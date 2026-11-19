import mongoose from "mongoose";
import Product from "../models/product.model.js";
import Warehouse from "../models/warehouse.model.js";
import User from "../models/user.model.js";
import SupplyRequest from "../models/supplyRequest.model.js";
import { addStock } from "../services/stock.service.js";
import httpError from "../utils/httpError.js";

const requestStatuses = ["Pending", "Approved", "Rejected"];
const populateRequest = [
  { path: "supplier", select: "name email" },
  { path: "product", select: "name sku imageUrl" },
  { path: "warehouse", select: "name" },
  { path: "reviewedBy", select: "name" },
];

function parsePage(value, fallback, maximum) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw httpError(400, "page and limit must be positive integers");
  }
  return maximum ? Math.min(parsed, maximum) : parsed;
}

function isValidOptionalText(value, maxLength) {
  return value === undefined || (typeof value === "string" && value.length <= maxLength);
}

function managerWarehouseIds(user) {
  return Array.isArray(user?.assignedWarehouses) ? user.assignedWarehouses : [];
}

async function getVisibleRequestFilter(user, warehouseId) {
  const filter = {};
  if (user.role === "supplier") {
    filter.supplier = user._id;
  } else if (user.role === "warehouseManager") {
    const manager = await User.findById(user._id).select("assignedWarehouses").lean();
    const assigned = managerWarehouseIds(manager);
    if (warehouseId && !assigned.some((id) => String(id) === String(warehouseId))) {
      throw httpError(403, "Warehouse access denied");
    }
    filter.warehouse = warehouseId ? warehouseId : { $in: assigned };
  } else if (warehouseId) {
    filter.warehouse = warehouseId;
  }
  return filter;
}

async function ensureManagerAccess(user, warehouseId) {
  if (user.role !== "warehouseManager") return [];
  const manager = await User.findById(user._id).select("assignedWarehouses").lean();
  const assigned = managerWarehouseIds(manager);
  if (!assigned.some((id) => String(id) === String(warehouseId))) {
    throw httpError(403, "Warehouse access denied");
  }
  return assigned;
}

export async function createSupplyRequest(req, res) {
  const { product, warehouse, quantity, note } = req.body;
  if (!mongoose.Types.ObjectId.isValid(product) || !mongoose.Types.ObjectId.isValid(warehouse)) {
    throw httpError(400, "Valid product and warehouse IDs are required");
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw httpError(400, "quantity must be a positive integer");
  }
  if (!isValidOptionalText(note, 500)) {
    throw httpError(400, "note must be text no longer than 500 characters");
  }

  const productRecord = await Product.findById(product).select("supplier");
  if (!productRecord) throw httpError(404, "Product not found");
  if (String(productRecord.supplier || "") !== String(req.user._id)) {
    throw httpError(403, "You can only supply your own products");
  }
  if (!(await Warehouse.exists({ _id: warehouse }))) {
    throw httpError(404, "Warehouse not found");
  }

  const request = await SupplyRequest.create({
    supplier: req.user._id,
    product,
    warehouse,
    quantity,
    note: typeof note === "string" ? note.trim() : undefined,
    status: "Pending",
  });
  await request.populate(populateRequest);
  res.status(201).json({ request });
}

export async function listSupplyRequests(req, res) {
  const filter = {};
  if (req.query.status) {
    if (!requestStatuses.includes(String(req.query.status))) {
      throw httpError(400, "Invalid supply request status");
    }
    filter.status = req.query.status;
  }
  if (req.query.warehouse) {
    if (!mongoose.Types.ObjectId.isValid(req.query.warehouse)) {
      throw httpError(400, "Invalid warehouse ID");
    }
    filter.warehouse = req.query.warehouse;
  }
  if (req.query.product) {
    if (!mongoose.Types.ObjectId.isValid(req.query.product)) {
      throw httpError(400, "Invalid product ID");
    }
    filter.product = req.query.product;
  }
  if (req.query.search) {
    const search = String(req.query.search).slice(0, 100)
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matchingProducts = await Product.find({
      $or: [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ],
    }).select("_id").lean();
    filter.product = { $in: matchingProducts.map((product) => product._id) };
  }

  Object.assign(filter, await getVisibleRequestFilter(req.user, req.query.warehouse));
  const page = parsePage(req.query.page, 1);
  const limit = parsePage(req.query.limit, 10, 50);
  const [requests, total] = await Promise.all([
    SupplyRequest.find(filter)
      .populate(populateRequest)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    SupplyRequest.countDocuments(filter),
  ]);
  res.json({ requests, total, page, pages: Math.ceil(total / limit) });
}

export async function getSupplyRequest(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw httpError(400, "Invalid supply request ID");
  }
  const request = await SupplyRequest.findById(req.params.id).populate(populateRequest);
  if (!request) throw httpError(404, "Supply request not found");

  if (req.user.role === "supplier" && String(request.supplier?._id) !== String(req.user._id)) {
    throw httpError(403, "Supply request access denied");
  }
  if (req.user.role === "warehouseManager") {
    await ensureManagerAccess(req.user, request.warehouse?._id);
  }
  res.json({ request });
}

export async function updateSupplyRequestStatus(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw httpError(400, "Invalid supply request ID");
  }
  const { status, reviewNote } = req.body;
  if (!["Approved", "Rejected"].includes(status)) {
    throw httpError(400, "Status must be Approved or Rejected");
  }
  if (!isValidOptionalText(reviewNote, 500)) {
    throw httpError(400, "reviewNote must be text no longer than 500 characters");
  }

  const existing = await SupplyRequest.findById(req.params.id).select("warehouse");
  if (!existing) throw httpError(404, "Supply request not found");
  const assignedWarehouses = await ensureManagerAccess(req.user, existing.warehouse);
  const selector = { _id: existing._id, status: "Pending" };
  if (req.user.role === "warehouseManager") {
    selector.warehouse = { $in: assignedWarehouses };
  }
  const set = {
    status,
    reviewedBy: req.user._id,
    reviewedAt: new Date(),
  };
  const unset = {};
  if (typeof reviewNote === "string" && reviewNote.trim()) {
    set.reviewNote = reviewNote.trim();
  } else {
    unset.reviewNote = 1;
  }
  const update = { $set: set };
  if (Object.keys(unset).length) update.$unset = unset;

  const request = await SupplyRequest.findOneAndUpdate(selector, update, { new: true });
  if (!request) {
    const latest = await SupplyRequest.findById(req.params.id).select("status warehouse");
    if (!latest) throw httpError(404, "Supply request not found");
    await ensureManagerAccess(req.user, latest.warehouse);
    throw httpError(400, "This request has already been reviewed");
  }

  if (status === "Approved") {
    try {
      await addStock({
        product: request.product,
        warehouse: request.warehouse,
        quantity: request.quantity,
        performedBy: req.user._id,
        note: `Supply request ${request._id}`,
      });
    } catch (cause) {
      try {
        const reset = await SupplyRequest.updateOne(
          { _id: request._id, status: "Approved", reviewedBy: req.user._id },
          {
            $set: { status: "Pending" },
            $unset: { reviewedBy: 1, reviewedAt: 1, reviewNote: 1 },
          }
        );
        if (reset.modifiedCount !== 1) {
          throw new Error("Could not return the supply request to Pending");
        }
      } catch (rollbackError) {
        rollbackError.cause = cause;
        throw rollbackError;
      }
      const error = httpError(500, "Failed to add stock for the approved supply request");
      error.cause = cause;
      throw error;
    }
  }

  await request.populate(populateRequest);
  res.json({ request });
}
