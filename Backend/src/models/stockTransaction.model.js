import mongoose from "mongoose";

const stockTransactionSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: true },
  transactionType: {
    type: String,
    enum: ["stock-in", "stock-out"],
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    validate: { validator: Number.isInteger, message: "quantity must be an integer" },
  },
  note: { type: String, trim: true, maxlength: 500 },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, default: Date.now },
});

export default mongoose.model("StockTransaction", stockTransactionSchema);
