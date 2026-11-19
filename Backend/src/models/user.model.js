import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    password: { type: String, required: true, minlength: 6, select: false },
    phone: { type: String, trim: true, maxlength: 30 },
    role: {
      type: String,
      enum: ["admin", "warehouseManager", "supplier", "salesRepresentative"],
      default: "salesRepresentative",
      required: true,
    },
    assignedWarehouses: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
    }],
    image: { type: String },
    imageFileId: { type: String },
    companyName: { type: String, trim: true, maxlength: 160 },
    address: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword() {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

userSchema.set("toJSON", {
  transform(_doc, ret) {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("User", userSchema);