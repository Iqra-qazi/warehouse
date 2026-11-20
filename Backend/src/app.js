import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import productRoutes from "./routes/product.routes.js";
import warehouseRoutes from "./routes/warehouse.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import stockRoutes from "./routes/stock.routes.js";
import orderRoutes from "./routes/order.routes.js";
import supplyRequestRoutes from "./routes/supplyRequest.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";
import { errorHandler, notFound } from "./middlewares/error.js";

const app = express();
const corsOptions = {
  origin: "*",  
  credentials: false,
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.options(/.*/, cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  if (!req.body) req.body = {};
  next();
});
app.use(cookieParser());

app.get("/", (req, res) => res.json({ message: "API running" }));
app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/warehouses", warehouseRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/supply-requests", supplyRequestRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
