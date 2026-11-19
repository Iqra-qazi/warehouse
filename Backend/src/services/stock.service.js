import mongoose from "mongoose";
import Stock from "../models/stock.model.js";
import StockTransaction from "../models/stockTransaction.model.js";
import httpError from "../utils/httpError.js";

function isTransactionsUnsupported(error) {
  return (
    error.code === 20 ||
    error.codeName === "IllegalOperation" ||
    /replica set|transaction numbers are only allowed|does not support transactions/i.test(error.message || "")
  );
}

function transactionData({ product, warehouse, quantity, type, performedBy, note }) {
  return {
    product,
    warehouse,
    transactionType: type,
    quantity,
    performedBy,
    note,
  };
}

async function getInsufficientStockError(product, warehouse, session) {
  const query = Stock.findOne({ product, warehouse }).select("quantity");
  if (session) query.session(session);
  const current = await query.lean();
  return httpError(400, `Insufficient stock. Available: ${current?.quantity ?? 0}`);
}

async function updateStock({ product, warehouse, quantity, type, session }) {
  if (type === "stock-in") {
    return Stock.findOneAndUpdate(
      { product, warehouse },
      { $inc: { quantity }, $setOnInsert: { product, warehouse } },
      { upsert: true, new: true, runValidators: true, session }
    );
  }
  return Stock.findOneAndUpdate(
    { product, warehouse, quantity: { $gte: quantity } },
    { $inc: { quantity: -quantity } },
    { new: true, runValidators: true, session }
  );
}

function transactionWriteError(cause) {
  const error = httpError(500, "Failed to record stock transaction");
  error.cause = cause;
  return error;
}

async function applyWithTransaction(args, session) {
  const stock = await updateStock({ ...args, session });
  if (!stock) {
    throw await getInsufficientStockError(args.product, args.warehouse, session);
  }
  try {
    const [transaction] = await StockTransaction.create(
      [transactionData(args)],
      { session }
    );
    return { stock, transaction };
  } catch (error) {
    throw transactionWriteError(error);
  }
}

async function applyWithoutTransaction(args) {
  let stock;
  try {
    stock = await updateStock({ ...args, session: null });
  } catch (error) {
    if (args.type !== "stock-in" || error.code !== 11000) throw error;
    stock = await Stock.findOneAndUpdate(
      { product: args.product, warehouse: args.warehouse },
      { $inc: { quantity: args.quantity } },
      { new: true, runValidators: true }
    );
  }
  if (!stock) {
    throw await getInsufficientStockError(args.product, args.warehouse);
  }

  try {
    const [transaction] = await StockTransaction.create([transactionData(args)]);
    return { stock, transaction };
  } catch (cause) {
    try {
      await Stock.findOneAndUpdate(
        { product: args.product, warehouse: args.warehouse },
        { $inc: { quantity: args.type === "stock-in" ? -args.quantity : args.quantity } },
        { new: true, runValidators: true }
      );
    } catch (rollbackError) {
      rollbackError.cause = cause;
      throw rollbackError;
    }
    throw transactionWriteError(cause);
  }
}

export async function applyStockChange(args) {
  if (!["stock-in", "stock-out"].includes(args.type)) {
    throw httpError(400, "Invalid stock transaction type");
  }
  if (!Number.isInteger(args.quantity) || args.quantity <= 0) {
    throw httpError(400, "quantity must be a positive integer");
  }

  if (args.session) {
    return applyWithTransaction(args, args.session);
  }

  if (process.env.USE_MONGO_TRANSACTIONS === "true") {
    let session;
    try {
      session = await mongoose.startSession();
      let result;
      await session.withTransaction(async () => {
        result = await applyWithTransaction(args, session);
      });
      return result;
    } catch (error) {
      if (!isTransactionsUnsupported(error)) throw error;
    } finally {
      if (session) await session.endSession();
    }
  }

  return applyWithoutTransaction(args);
}

export function addStock(args) {
  return applyStockChange({ ...args, type: "stock-in" });
}

export function removeStock(args) {
  return applyStockChange({ ...args, type: "stock-out" });
}
