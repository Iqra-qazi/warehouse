import mongoose from "mongoose";
import User from "../models/user.model.js";

export default async function warehouseAccess(req, res, next) {
  try {
    if (req.user?.role === "admin") return next();
    if (req.user?.role !== "warehouseManager") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const user = await User.findById(req.user._id).select("role assignedWarehouses");
    if (!user || user.role !== "warehouseManager") {
      return res.status(403).json({ message: "Forbidden" });
    }
    const assignedWarehouses = Array.isArray(user.assignedWarehouses)
      ? user.assignedWarehouses
      : [];
    req.user.assignedWarehouses = assignedWarehouses;

    const warehouseId =
      req.params.warehouseId ||
      req.params.id ||
      req.body?.warehouse ||
      req.body?.warehouseId ||
      req.query?.warehouse ||
      req.query?.warehouseId;

    if (
      warehouseId &&
      (!mongoose.Types.ObjectId.isValid(warehouseId) ||
        !assignedWarehouses.some((id) => String(id) === String(warehouseId)))
    ) {
      return res.status(403).json({ message: "Warehouse access denied" });
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

export function warehouseReadAccess(req, res, next) {
  if (req.user?.role === "salesRepresentative") return next();
  return warehouseAccess(req, res, next);
}
