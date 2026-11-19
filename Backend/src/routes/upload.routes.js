import { Router } from "express";
import multer from "multer";
import protect from "../middlewares/auth.js";
import authorizeRoles from "../middlewares/role.js";
import asyncHandler from "../utils/asyncHandler.js";
import { getUploadAuth, upload } from "../controllers/upload.controller.js";

const router = Router();
const ALL_ROLES = ["admin", "warehouseManager", "supplier", "salesRepresentative"];
const uploadFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
});

router.use(protect);
router.get("/auth", authorizeRoles(...ALL_ROLES), getUploadAuth);
router.post("/", authorizeRoles(...ALL_ROLES), uploadFile.single("image"), asyncHandler(upload));

export default router;
