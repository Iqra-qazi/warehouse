import { Router } from "express";
import { login, logout, me, register } from "../controllers/auth.controller.js";
import protect from "../middlewares/auth.js";
import authorizeRoles from "../middlewares/role.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();
const ALL_ROLES = ["admin", "warehouseManager", "supplier", "salesRepresentative"];
router.post("/register", asyncHandler(register));
router.post("/login", asyncHandler(login));
router.post("/logout", protect, authorizeRoles(...ALL_ROLES), logout);
router.get("/me", protect, authorizeRoles(...ALL_ROLES), asyncHandler(me));

export default router;