import { Router } from "express";
import protect from "../middlewares/auth.js";
import authorizeRoles from "../middlewares/role.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  createWarehouse,
  deleteWarehouse,
  listWarehouses,
  listWarehouseOptions,
  updateWarehouse,
} from "../controllers/warehouse.controller.js";

const router = Router();
router.use(protect);
router.get(
  "/options",
  authorizeRoles("admin", "warehouseManager", "supplier", "salesRepresentative"),
  asyncHandler(listWarehouseOptions)
);
router.get(
  "/",
  authorizeRoles("admin", "warehouseManager"),
  asyncHandler(listWarehouses)
);
router.post("/", authorizeRoles("admin"), asyncHandler(createWarehouse));
router.put("/:id", authorizeRoles("admin"), asyncHandler(updateWarehouse));
router.delete("/:id", authorizeRoles("admin"), asyncHandler(deleteWarehouse));

export default router;
