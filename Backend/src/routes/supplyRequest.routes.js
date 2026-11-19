import { Router } from "express";
import protect from "../middlewares/auth.js";
import authorizeRoles from "../middlewares/role.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  createSupplyRequest,
  getSupplyRequest,
  listSupplyRequests,
  updateSupplyRequestStatus,
} from "../controllers/supplyRequest.controller.js";

const router = Router();
router.use(protect);
router.post("/", authorizeRoles("supplier"), asyncHandler(createSupplyRequest));
router.get("/", authorizeRoles("supplier", "admin", "warehouseManager"), asyncHandler(listSupplyRequests));
router.get("/:id", authorizeRoles("supplier", "admin", "warehouseManager"), asyncHandler(getSupplyRequest));
router.put(
  "/:id/status",
  authorizeRoles("admin", "warehouseManager"),
  asyncHandler(updateSupplyRequestStatus)
);

export default router;
