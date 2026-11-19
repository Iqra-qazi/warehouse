import mongoose from "mongoose";

const warehouseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    location: { type: String, required: true, trim: true, maxlength: 300 },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    capacity: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Warehouse", warehouseSchema);
