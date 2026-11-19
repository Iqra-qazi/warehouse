import { Router } from "express";
import protect from "../middlewares/auth.js";
import authorizeRoles from "../middlewares/role.js";
import asyncHandler from "../utils/asyncHandler.js";
import { adminStats, managerStats, salesStats, supplierStats } from "../controllers/dashboard.controller.js";

const router = Router();
router.use(protect);
router.get("/stats", authorizeRoles("admin"), asyncHandler(adminStats));
router.get("/manager", authorizeRoles("warehouseManager"), asyncHandler(managerStats));
router.get("/sales", authorizeRoles("salesRepresentative"), asyncHandler(salesStats));
router.get("/supplier", authorizeRoles("supplier"), asyncHandler(supplierStats));

export default router;
