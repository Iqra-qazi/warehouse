import { Router } from "express";
import protect from "../middlewares/auth.js";
import authorizeRoles from "../middlewares/role.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  createProduct,
  deleteProduct,
  getProduct,
  getProductStock,
  listProducts,
  listProductCategories,
  updateProduct,
} from "../controllers/product.controller.js";

const router = Router();
router.use(protect);
router.get("/", authorizeRoles("admin", "warehouseManager", "supplier", "salesRepresentative"), asyncHandler(listProducts));
router.get("/categories", authorizeRoles("admin", "warehouseManager", "supplier", "salesRepresentative"), asyncHandler(listProductCategories));
router.get("/:id/stock", authorizeRoles("admin", "warehouseManager", "supplier", "salesRepresentative"), asyncHandler(getProductStock));
router.get("/:id", authorizeRoles("admin", "warehouseManager", "supplier", "salesRepresentative"), asyncHandler(getProduct));
router.post("/", authorizeRoles("admin", "warehouseManager"), asyncHandler(createProduct));
router.put("/:id", authorizeRoles("admin", "warehouseManager"), asyncHandler(updateProduct));
router.delete("/:id", authorizeRoles("admin"), asyncHandler(deleteProduct));

export default router;
