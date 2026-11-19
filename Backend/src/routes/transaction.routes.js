import { Router } from "express";
import protect from "../middlewares/auth.js";
import authorizeRoles from "../middlewares/role.js";
import warehouseAccess from "../middlewares/warehouseAccess.js";
import asyncHandler from "../utils/asyncHandler.js";
import { getTransactions } from "../controllers/stock.controller.js";

const router = Router();
router.use(protect);
router.get("/", authorizeRoles("admin", "warehouseManager"), warehouseAccess, asyncHandler(getTransactions));

export default router;
