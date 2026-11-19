import { Router } from "express";
import protect from "../middlewares/auth.js";
import authorizeRoles from "../middlewares/role.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  cancelOrder,
  createOrder,
  getOrder,
  listOrders,
  updateOrderStatus,
} from "../controllers/order.controller.js";

const router = Router();
router.use(protect);
router.post("/", authorizeRoles("admin", "salesRepresentative"), asyncHandler(createOrder));
router.get("/", authorizeRoles("admin", "salesRepresentative", "warehouseManager"), asyncHandler(listOrders));
router.get("/:id", authorizeRoles("admin", "salesRepresentative", "warehouseManager"), asyncHandler(getOrder));
router.put("/:id/status", authorizeRoles("admin", "warehouseManager"), asyncHandler(updateOrderStatus));
router.put("/:id/cancel", authorizeRoles("admin", "salesRepresentative"), asyncHandler(cancelOrder));

export default router;
