import mongoose from "mongoose";
import User from "../models/user.model.js";
import Warehouse from "../models/warehouse.model.js";
import Stock from "../models/stock.model.js";
import StockTransaction from "../models/stockTransaction.model.js";
import Order from "../models/order.model.js";
import SupplyRequest from "../models/supplyRequest.model.js";
import httpError from "../utils/httpError.js";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function validateManager(managerId) {
  if (!managerId) return;
  if (!mongoose.Types.ObjectId.isValid(managerId)) {
    throw httpError(400, "A valid warehouse manager ID is required");
  }
  const manager = await User.findOne({ _id: managerId, role: "warehouseManager" });
  if (!manager) throw httpError(400, "Assigned user is not a warehouse manager");
}

async function validateWarehouseFields(fields) {
  if (typeof fields.name !== "string" || !fields.name.trim()) {
    throw httpError(400, "Warehouse name is required");
  }
  if (typeof fields.location !== "string" || !fields.location.trim()) {
    throw httpError(400, "Warehouse location is required");
  }
  const capacity = Number(fields.capacity);
  if (!Number.isFinite(capacity) || capacity <= 0) {
    throw httpError(400, "Warehouse capacity must be a number greater than 0");
  }

  const manager = fields.manager === "" || fields.manager === null
    ? undefined
    : fields.manager;
  await validateManager(manager);
  return {
    name: fields.name.trim(),
    location: fields.location.trim(),
    capacity,
    manager,
  };
}

async function syncManager(warehouseId, oldManagerId, newManagerId) {
  if (oldManagerId && String(oldManagerId) !== String(newManagerId)) {
    await User.updateOne({ _id: oldManagerId }, { $pull: { assignedWarehouses: warehouseId } });
  }
  if (newManagerId) {
    await User.updateOne(
      { _id: newManagerId, role: "warehouseManager" },
      { $addToSet: { assignedWarehouses: warehouseId } }
    );
  }
}

export async function listWarehouses(req, res) {
  const filter = {};
  if (req.user.role === "warehouseManager") {
    filter._id = { $in: req.user.assignedWarehouses };
  }
  if (req.query.search) {
    const search = escapeRegex(String(req.query.search).slice(0, 100));
    filter.name = { $regex: search, $options: "i" };
  }
  const warehouses = await Warehouse.find(filter).populate("manager", "name email").sort({ name: 1 });
  res.json({ warehouses });
}

export async function listWarehouseOptions(req, res) {
  let filter = {};
  if (req.user.role === "warehouseManager") {
    const manager = await User.findById(req.user._id).select("assignedWarehouses").lean();
    filter = { _id: { $in: manager?.assignedWarehouses ?? [] } };
  }
  const warehouses = await Warehouse.find(filter).select("_id name").sort({ name: 1 });
  res.json({ warehouses });
}

export async function createWarehouse(req, res) {
  const fields = await validateWarehouseFields(req.body);
  const warehouse = await Warehouse.create(fields);
  await syncManager(warehouse._id, undefined, warehouse.manager);
  await warehouse.populate("manager", "name email");
  res.status(201).json({ warehouse });
}

export async function updateWarehouse(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw httpError(400, "Invalid warehouse ID");
  const warehouse = await Warehouse.findById(req.params.id);
  if (!warehouse) throw httpError(404, "Warehouse not found");
  const oldManager = warehouse.manager;
  const fields = await validateWarehouseFields({
    name: req.body.name ?? warehouse.name,
    location: req.body.location ?? warehouse.location,
    capacity: req.body.capacity ?? warehouse.capacity,
    manager: req.body.manager === undefined ? warehouse.manager : req.body.manager,
  });
  warehouse.set(fields);
  await warehouse.save();
  await syncManager(warehouse._id, oldManager, warehouse.manager);
  await warehouse.populate("manager", "name email");
  res.json({ warehouse });
}

export async function deleteWarehouse(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw httpError(400, "Invalid warehouse ID");
  const warehouse = await Warehouse.findById(req.params.id);
  if (!warehouse) throw httpError(404, "Warehouse not found");
  const [hasAvailableStock, hasTransaction, hasOrders, hasRequests] = await Promise.all([
    Stock.exists({ warehouse: warehouse._id, quantity: { $gt: 0 } }),
    StockTransaction.exists({ warehouse: warehouse._id }),
    Order.exists({ warehouse: warehouse._id }),
    SupplyRequest.exists({ warehouse: warehouse._id }),
  ]);
  const hasHistory = hasTransaction || hasOrders || hasRequests;
  if (hasAvailableStock) {
    throw httpError(400, "Cannot delete this warehouse while it has stock. Remove its stock first.");
  }
  if (hasHistory) {
    throw httpError(409, "Cannot delete a warehouse referenced by stock transactions, orders, or supply requests.");
  }
  await Stock.deleteMany({ warehouse: warehouse._id });
  await User.updateMany(
    { assignedWarehouses: warehouse._id },
    { $pull: { assignedWarehouses: warehouse._id } }
  );
  await warehouse.deleteOne();
  res.json({ message: "Warehouse deleted" });
}
