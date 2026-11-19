import mongoose from "mongoose";
import User from "../models/user.model.js";
import Product from "../models/product.model.js";
import Warehouse from "../models/warehouse.model.js";
import Stock from "../models/stock.model.js";
import StockTransaction from "../models/stockTransaction.model.js";
import Order from "../models/order.model.js";
import SupplyRequest from "../models/supplyRequest.model.js";

export async function adminStats(req, res) {
  const [users, products, warehouses, suppliers, orders, pendingOrders, pendingRequests, lowStockRows] = await Promise.all([
    User.countDocuments(),
    Product.countDocuments(),
    Warehouse.countDocuments(),
    User.countDocuments({ role: "supplier" }),
    Order.countDocuments(),
    Order.countDocuments({ status: "Pending" }),
    SupplyRequest.countDocuments({ status: "Pending" }),
    Stock.aggregate([
      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      { $match: { $expr: { $lte: ["$quantity", "$product.lowStockLimit"] } } },
      { $count: "count" },
    ]),
  ]);
  res.json({
    users,
    products,
    warehouses,
    suppliers,
    orders,
    pendingOrders,
    pendingRequests,
    lowStockCount: lowStockRows[0]?.count ?? 0,
  });
}

export async function managerStats(req, res) {
  const manager = await User.findById(req.user._id).select("assignedWarehouses").lean();
  const warehouses = manager?.assignedWarehouses ?? [];
  const [stockItems, lowStock, recentTransactions, pendingOrders, pendingRequests] = await Promise.all([
    Stock.countDocuments({ warehouse: { $in: warehouses } }),
    Stock.aggregate([
      { $match: { warehouse: { $in: warehouses } } },
      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      { $match: { $expr: { $lte: ["$quantity", "$product.lowStockLimit"] } } },
      { $count: "count" },
    ]),
    StockTransaction.find({ warehouse: { $in: warehouses } })
      .populate("product", "name sku")
      .populate("warehouse", "name")
      .sort({ date: -1 })
      .limit(10),
    Order.countDocuments({ warehouse: { $in: warehouses }, status: "Pending" }),
    SupplyRequest.countDocuments({ warehouse: { $in: warehouses }, status: "Pending" }),
  ]);
  res.json({
    assignedWarehouses: warehouses.length,
    stockItems,
    lowStockCount: lowStock[0]?.count || 0,
    recentTransactions,
    pendingOrders,
    pendingRequests,
  });
}

export async function supplierStats(req, res) {
  const supplier = req.user._id;
  const [products, totalRequests, pending, approved, rejected, recentRequests] = await Promise.all([
    Product.countDocuments({ supplier }),
    SupplyRequest.countDocuments({ supplier }),
    SupplyRequest.countDocuments({ supplier, status: "Pending" }),
    SupplyRequest.countDocuments({ supplier, status: "Approved" }),
    SupplyRequest.countDocuments({ supplier, status: "Rejected" }),
    SupplyRequest.find({ supplier })
      .populate("product", "name sku imageUrl")
      .populate("warehouse", "name")
      .sort({ createdAt: -1 })
      .limit(5),
  ]);
  res.json({ products, totalRequests, pending, approved, rejected, recentRequests });
}

export async function salesStats(req, res) {
  const owner = new mongoose.Types.ObjectId(req.user._id);
  const counts = await Order.aggregate([
    { $match: { createdBy: owner } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const byStatus = Object.fromEntries(
    ["Pending", "Processing", "Completed", "Cancelled"].map((status) => [status, 0])
  );
  for (const { _id, count } of counts) byStatus[_id] = count;
  const [completed, recentOrders] = await Promise.all([
    Order.aggregate([
      { $match: { createdBy: owner, status: "Completed" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    Order.find({ createdBy: owner })
      .populate("warehouse", "name")
      .populate("createdBy", "name email")
      .populate("products.product", "name sku imageUrl")
      .sort({ createdAt: -1 })
      .limit(5),
  ]);
  res.json({
    total: counts.reduce((sum, item) => sum + item.count, 0),
    pending: byStatus.Pending,
    processing: byStatus.Processing,
    completed: byStatus.Completed,
    cancelled: byStatus.Cancelled,
    totalSpent: completed[0]?.total ?? 0,
    recentOrders,
  });
}
