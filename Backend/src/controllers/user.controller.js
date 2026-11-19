import mongoose from "mongoose";
import User from "../models/user.model.js";
import Warehouse from "../models/warehouse.model.js";
import Product from "../models/product.model.js";
import SupplyRequest from "../models/supplyRequest.model.js";
import StockTransaction from "../models/stockTransaction.model.js";
import Order from "../models/order.model.js";
import { deleteImage, verifyImage } from "../../services/storage.service.js";
import httpError from "../utils/httpError.js";

const EDITABLE_FIELDS = [
  "name",
  "email",
  "password",
  "phone",
  "role",
  "assignedWarehouses",
  "image",
  "imageFileId",
  "companyName",
  "address",
];
const SELF_FIELDS = new Set([
  "name", "email", "password", "phone", "image", "imageFileId", "companyName", "address",
]);
const USER_ROLES = new Set([
  "admin",
  "warehouseManager",
  "supplier",
  "salesRepresentative",
]);

async function validateImage(body) {
  const hasUrl = body.image !== undefined;
  const hasId = body.imageFileId !== undefined;
  if (hasUrl !== hasId) throw httpError(400, "Image URL and file ID must be provided together");
  if (hasId && body.imageFileId) {
    const verified = await verifyImage(body.imageFileId, body.image);
    body.image = verified.url;
    body.imageFileId = verified.fileId;
  }
}

async function validateAssignments(body) {
  if (!Array.isArray(body.assignedWarehouses)) {
    if (body.assignedWarehouses !== undefined) throw httpError(400, "assignedWarehouses must be an array");
    return;
  }
  const ids = [...new Set(body.assignedWarehouses.map(String))];
  if (ids.length !== body.assignedWarehouses.length) {
    throw httpError(400, "assignedWarehouses cannot contain duplicates");
  }
  const count = await Warehouse.countDocuments({ _id: { $in: ids } });
  if (count !== ids.length) throw httpError(400, "One or more assigned warehouses do not exist");
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

export async function listSuppliers(req, res) {
  const page = parsePageValue(req.query.page, 1);
  const limit = parsePageValue(req.query.limit, 10, 50);
  const filter = { role: "supplier" };
  if (req.query.search) {
    const search = String(req.query.search).slice(0, 100)
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { companyName: { $regex: search, $options: "i" } },
    ];
  }
  const [records, total] = await Promise.all([
    User.find(filter)
      .select("name email phone companyName address image createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);
  const suppliers = await Promise.all(records.map(async (record) => {
    const [productCount, pendingRequests, approvedRequests] = await Promise.all([
      Product.countDocuments({ supplier: record._id }),
      SupplyRequest.countDocuments({ supplier: record._id, status: "Pending" }),
      SupplyRequest.countDocuments({ supplier: record._id, status: "Approved" }),
    ]);
    return {
      _id: record._id,
      name: record.name,
      email: record.email,
      phone: record.phone,
      companyName: record.companyName,
      address: record.address,
      image: record.image,
      createdAt: record.createdAt,
      productCount,
      pendingRequests,
      approvedRequests,
    };
  }));
  res.json({ suppliers, total, page, pages: Math.ceil(total / limit) });
}

export async function getSupplier(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw httpError(400, "Invalid supplier ID");
  const supplier = await User.findOne({ _id: req.params.id, role: "supplier" })
    .select("name email phone companyName address image createdAt");
  if (!supplier) throw httpError(404, "Supplier not found");
  const [products, recentRequests] = await Promise.all([
    Product.find({ supplier: supplier._id })
      .select("name sku price imageUrl")
      .sort({ name: 1 }),
    SupplyRequest.find({ supplier: supplier._id })
      .populate("product", "name sku imageUrl")
      .populate("warehouse", "name")
      .populate("reviewedBy", "name")
      .sort({ createdAt: -1 })
      .limit(10),
  ]);
  res.json({ supplier, products, recentRequests });
}

export async function listUsers(req, res) {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.search) {
    const search = String(req.query.search)
      .slice(0, 100)
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }
  const users = await User.find(filter)
    .populate("assignedWarehouses", "name location")
    .sort({ createdAt: -1 });
  res.json({ users });
}

export async function createUser(req, res) {
  const body = { ...req.body };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
  const password = body.password;
  if (!name || !email || typeof password !== "string" || password.length < 6) {
    throw httpError(400, "Name, email, and a password of at least 6 characters are required");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw httpError(400, "A valid email is required");
  }
  if (!USER_ROLES.has(body.role)) throw httpError(400, "A valid user role is required");
  if (await User.exists({ email })) throw httpError(409, "A user with this email already exists");

  body.name = name;
  body.email = email;
  await validateImage(body);
  await validateAssignments(body);
  if (body.assignedWarehouses?.length && body.role !== "warehouseManager") {
    throw httpError(400, "Only warehouse managers can be assigned warehouses");
  }

  const fields = Object.fromEntries(
    EDITABLE_FIELDS
      .filter((field) => body[field] !== undefined)
      .map((field) => [
        field,
        field === "email" ? String(body[field]).toLowerCase().trim() : body[field],
      ])
  );
  const user = await User.create(fields);
  if (user.role === "warehouseManager" && user.assignedWarehouses.length) {
    await User.updateMany(
      {
        _id: { $ne: user._id },
        role: "warehouseManager",
        assignedWarehouses: { $in: user.assignedWarehouses },
      },
      { $pull: { assignedWarehouses: { $in: user.assignedWarehouses } } }
    );
    await Warehouse.updateMany(
      { _id: { $in: user.assignedWarehouses } },
      { $set: { manager: user._id } }
    );
  }
  res.status(201).json({ user: user.toJSON() });
}

export async function updateUser(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw httpError(400, "Invalid user ID");
  const isAdmin = req.user.role === "admin";
  if (!isAdmin && String(req.user._id) !== req.params.id) {
    throw httpError(403, "You can only update your own profile");
  }
  if (!isAdmin && Object.keys(req.body).some((key) => !SELF_FIELDS.has(key))) {
    throw httpError(403, "You cannot change roles or warehouse assignments");
  }

  const user = await User.findById(req.params.id);
  if (!user) throw httpError(404, "User not found");
  const oldAssignedWarehouses = user.assignedWarehouses.map(String);
  const oldFileId = user.imageFileId;
  const body = { ...req.body };
  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      throw httpError(400, "Name is required");
    }
    body.name = body.name.trim();
  }
  if (body.email !== undefined) {
    if (typeof body.email !== "string" || !body.email.trim()) {
      throw httpError(400, "Email is required");
    }
    body.email = body.email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      throw httpError(400, "A valid email is required");
    }
    if (await User.exists({ _id: { $ne: user._id }, email: body.email })) {
      throw httpError(409, "A user with this email already exists");
    }
  }
  if (body.password === "") {
    delete body.password;
  } else if (body.password !== undefined &&
      (typeof body.password !== "string" || body.password.length < 6)) {
    throw httpError(400, "Password must be at least 6 characters");
  }
  if (body.role !== undefined && !USER_ROLES.has(body.role)) {
    throw httpError(400, "A valid user role is required");
  }
  await validateImage(body);
  if (isAdmin) {
    await validateAssignments(body);
    if (body.assignedWarehouses?.length && body.role !== "warehouseManager" &&
        (body.role !== undefined || user.role !== "warehouseManager")) {
      throw httpError(400, "Only warehouse managers can be assigned warehouses");
    }
  }

  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) {
      user[field] = field === "email" ? String(body[field]).toLowerCase().trim() : body[field];
    }
  }
  if (isAdmin && body.role && body.role !== "warehouseManager" && body.assignedWarehouses === undefined) {
    user.assignedWarehouses = [];
  }
  await user.save();
  if (isAdmin && (body.assignedWarehouses !== undefined || body.role !== undefined)) {
    const newAssignedWarehouses = user.role === "warehouseManager"
      ? user.assignedWarehouses.map(String)
      : [];
    const removed = oldAssignedWarehouses.filter((id) => !newAssignedWarehouses.includes(id));
    const added = newAssignedWarehouses.filter((id) => !oldAssignedWarehouses.includes(id));
    if (removed.length) {
      await Warehouse.updateMany(
        { _id: { $in: removed }, manager: user._id },
        { $unset: { manager: "" } }
      );
    }
    if (added.length) {
      await User.updateMany(
        {
          _id: { $ne: user._id },
          role: "warehouseManager",
          assignedWarehouses: { $in: added },
        },
        { $pull: { assignedWarehouses: { $in: added } } }
      );
      await Warehouse.updateMany(
        { _id: { $in: added } },
        { $set: { manager: user._id } }
      );
    }
  }
  if (oldFileId && oldFileId !== user.imageFileId) await deleteImage(oldFileId);
  res.json({ user: user.toJSON() });
}

export async function updateMyImage(req, res) {
  const body = { image: req.body.image, imageFileId: req.body.imageFileId };
  await validateImage(body);
  const user = await User.findById(req.user._id);
  const oldFileId = user.imageFileId;
  user.image = body.image;
  user.imageFileId = body.imageFileId;
  await user.save();
  if (oldFileId && oldFileId !== user.imageFileId) await deleteImage(oldFileId);
  res.json({ user: user.toJSON() });
}

export async function deleteUser(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw httpError(400, "Invalid user ID");
  const user = await User.findById(req.params.id);
  if (!user) throw httpError(404, "User not found");
  if (String(user._id) === String(req.user._id)) {
    throw httpError(400, "You cannot delete your own account");
  }
  const [products, transactions, orders, supplyRequests] = await Promise.all([
    Product.exists({ $or: [{ supplier: user._id }, { createdBy: user._id }] }),
    StockTransaction.exists({ performedBy: user._id }),
    Order.exists({ createdBy: user._id }),
    SupplyRequest.exists({ $or: [{ supplier: user._id }, { reviewedBy: user._id }] }),
  ]);
  if (products || transactions || orders || supplyRequests) {
    throw httpError(409, "Cannot delete a user referenced by products, stock transactions, orders, or supply requests.");
  }
  if (user.imageFileId) await deleteImage(user.imageFileId);
  await Warehouse.updateMany(
    { manager: user._id },
    { $unset: { manager: "" } }
  );
  await user.deleteOne();
  res.json({ message: "User deleted" });
}
