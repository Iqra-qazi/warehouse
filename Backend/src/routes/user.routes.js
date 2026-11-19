import { Router } from "express";
import protect from "../middlewares/auth.js";
import authorizeRoles from "../middlewares/role.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  createUser,
  deleteUser,
  getSupplier,
  listSuppliers,
  listUsers,
  updateMyImage,
  updateUser,
} from "../controllers/user.controller.js";

const router = Router();
const ALL_ROLES = ["admin", "warehouseManager", "supplier", "salesRepresentative"];
router.use(protect);
router.get("/suppliers", authorizeRoles("admin"), asyncHandler(listSuppliers));
router.get("/suppliers/:id", authorizeRoles("admin"), asyncHandler(getSupplier));
router.get("/", authorizeRoles("admin"), asyncHandler(listUsers));
router.post("/", authorizeRoles("admin"), asyncHandler(createUser));
router.put("/me/image", authorizeRoles(...ALL_ROLES), asyncHandler(updateMyImage));
router.put("/:id", authorizeRoles(...ALL_ROLES), asyncHandler(updateUser));
router.delete("/:id", authorizeRoles("admin"), asyncHandler(deleteUser));

export default router;
