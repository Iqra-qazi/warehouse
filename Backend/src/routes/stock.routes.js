import { Router } from "express";
import protect from "../middlewares/auth.js";
import authorizeRoles from "../middlewares/role.js";
import warehouseAccess, { warehouseReadAccess } from "../middlewares/warehouseAccess.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  getLowStock,
  getStock,
  getTransactions,
  stockIn,
  stockOut,
} from "../controllers/stock.controller.js";

const router = Router();
router.use(protect);
router.post("/in", authorizeRoles("admin", "warehouseManager"), warehouseAccess, asyncHandler(stockIn));
router.post("/out", authorizeRoles("admin", "warehouseManager"), warehouseAccess, asyncHandler(stockOut));
router.get("/", authorizeRoles("admin", "warehouseManager", "salesRepresentative"), warehouseReadAccess, asyncHandler(getStock));
router.get("/low", authorizeRoles("admin", "warehouseManager"), warehouseAccess, asyncHandler(getLowStock));
router.get("/transactions", authorizeRoles("admin", "warehouseManager"), warehouseAccess, asyncHandler(getTransactions));

export default router;
